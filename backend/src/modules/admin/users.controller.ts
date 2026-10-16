import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, IUser, UserRole } from '../../models/user.model';
import { Order } from '../../models/order.model';
import { sendSuccess } from '../../utils/apiResponse';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';

export class AdminUsersController {
  /**
   * List all users directly from MongoDB with search, role, status filters and order spend aggregation
   */
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
      const search = (req.query.search as string || '').trim();
      const role = (req.query.role as string || '').toUpperCase();
      const status = (req.query.status as string || '').toUpperCase();

      const query: Record<string, any> = {};

      if (role && role !== 'ALL') {
        query.role = role as UserRole;
      }

      if (status === 'ACTIVE') {
        query.isActive = true;
      } else if (status === 'BLOCKED' || status === 'INACTIVE') {
        query.isActive = false;
      }

      if (search) {
        query.$or = [
          { displayName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
        ];
      }

      // Filter out test administrator from the users list
      query.displayName = { $nin: ['Test Administrator', 'test administrator', 'Test Admin'] };

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Aggregate order statistics for returned users
      const userIds = users.map((u) => u._id);
      const userEmails = users.map((u) => u.email.toLowerCase());
      const userPhones = users.map((u) => u.phoneNumber).filter(Boolean);

      const orders = await Order.find({
        $or: [
          { customerId: { $in: userIds } },
          { customerEmail: { $in: userEmails } },
          { customerPhone: { $in: userPhones } },
        ],
      })
        .select('customerId customerEmail customerPhone totalAmount orderStatus createdAt')
        .lean();

      const userStatsMap = new Map<string, { orderCount: number; totalSpend: number; lastOrderDate: Date | null }>();

      for (const order of orders) {
        const matchingUser = users.find((u) =>
          (order.customerId && u._id.toString() === order.customerId.toString()) ||
          (order.customerEmail && u.email.toLowerCase() === order.customerEmail.toLowerCase()) ||
          (order.customerPhone && u.phoneNumber && u.phoneNumber === order.customerPhone)
        );

        if (matchingUser) {
          const uidStr = matchingUser._id.toString();
          const current = userStatsMap.get(uidStr) || { orderCount: 0, totalSpend: 0, lastOrderDate: null };
          current.orderCount += 1;
          if (order.orderStatus !== 'CANCELLED') {
            current.totalSpend += order.totalAmount || 0;
          }
          if (!current.lastOrderDate || new Date(order.createdAt) > current.lastOrderDate) {
            current.lastOrderDate = new Date(order.createdAt);
          }
          userStatsMap.set(uidStr, current);
        }
      }

      const items = users.map((u) => {
        const stats = userStatsMap.get(u._id.toString()) || { orderCount: 0, totalSpend: 0, lastOrderDate: null };
        return {
          id: u._id.toString(),
          _id: u._id.toString(),
          firebaseUid: u.firebaseUid,
          email: u.email,
          displayName: u.displayName,
          phoneNumber: u.phoneNumber || '',
          photoURL: u.photoURL || '',
          role: u.role,
          isActive: u.isActive,
          status: u.isActive ? 'ACTIVE' : 'BLOCKED',
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          orderCount: stats.orderCount,
          totalSpend: Math.round(stats.totalSpend * 100) / 100,
          lastOrderDate: stats.lastOrderDate ? stats.lastOrderDate.toISOString() : null,
          isRootAdmin: u.email.toLowerCase() === 'kanhaiyaastore@gmail.com',
        };
      });

      return sendSuccess(
        res,
        {
          users: items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
        'Users list retrieved from MongoDB'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single user details directly from MongoDB with their orders
   */
  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Invalid MongoDB User ID format');
      }

      const user = await User.findById(id).lean();
      if (!user) {
        throw new NotFoundError('User not found in MongoDB');
      }

      const orders = await Order.find({
        $or: [
          { customerId: user._id },
          { customerEmail: user.email.toLowerCase() },
          ...(user.phoneNumber ? [{ customerPhone: user.phoneNumber }] : []),
        ],
      })
        .sort({ createdAt: -1 })
        .lean();

      return sendSuccess(
        res,
        {
          user: {
            ...user,
            id: user._id.toString(),
            isRootAdmin: user.email.toLowerCase() === 'kanhaiyaastore@gmail.com',
          },
          orders,
        },
        'User profile and orders retrieved'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new user directly in MongoDB
   */
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, displayName, phoneNumber, role, isActive } = req.body;

      if (!email || !email.includes('@')) {
        throw new BadRequestError('A valid email address is required');
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        throw new BadRequestError(`User with email ${normalizedEmail} already exists`);
      }

      const safeRole: UserRole = role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
      const safeActive = typeof isActive === 'boolean' ? isActive : true;
      const fallbackUid = req.body.firebaseUid?.trim() || `mongo_usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const newUser = await User.create({
        email: normalizedEmail,
        displayName: displayName?.trim() || 'New Customer',
        phoneNumber: phoneNumber?.trim() || '',
        role: safeRole,
        isActive: safeActive,
        firebaseUid: fallbackUid,
        lastLoginAt: new Date(),
      });

      return sendSuccess(
        res,
        {
          ...newUser.toObject(),
          id: newUser._id.toString(),
          isRootAdmin: newUser.email.toLowerCase() === 'kanhaiyaastore@gmail.com',
        },
        'User created directly in MongoDB',
        201
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update an existing user in MongoDB (Name, Phone, Role, Active Status)
   */
  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Invalid MongoDB User ID format');
      }

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('User not found in MongoDB');
      }

      const isRoot = user.email.toLowerCase() === 'kanhaiyaastore@gmail.com';
      const { displayName, phoneNumber, role, isActive, status } = req.body;

      if (isRoot) {
        if (role && role !== 'ADMIN') {
          throw new ForbiddenError('Root administrator role cannot be demoted');
        }
        if (isActive === false || status === 'BLOCKED') {
          throw new ForbiddenError('Root administrator account cannot be deactivated');
        }
      }

      if (displayName !== undefined && displayName.trim().length > 0) {
        user.displayName = displayName.trim();
      }

      if (phoneNumber !== undefined) {
        user.phoneNumber = phoneNumber.trim();
      }

      if (role && (role === 'ADMIN' || role === 'CUSTOMER')) {
        if (!isRoot) {
          user.role = role;
        }
      }

      let activeToSet: boolean | undefined = undefined;
      if (typeof isActive === 'boolean') {
        activeToSet = isActive;
      } else if (typeof status === 'string') {
        activeToSet = status === 'ACTIVE';
      }

      if (activeToSet !== undefined && !isRoot) {
        user.isActive = activeToSet;
      }

      await user.save();

      return sendSuccess(
        res,
        {
          ...user.toObject(),
          id: user._id.toString(),
          isActive: user.isActive,
          status: user.isActive ? 'ACTIVE' : 'BLOCKED',
          isRootAdmin: isRoot,
        },
        'User updated directly in MongoDB'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a user directly from MongoDB
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Invalid MongoDB User ID format');
      }

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('User not found in MongoDB');
      }

      if (user.email.toLowerCase() === 'kanhaiyaastore@gmail.com') {
        throw new ForbiddenError('The root store owner account kanhaiyaastore@gmail.com cannot be deleted');
      }

      await User.findByIdAndDelete(id);

      return sendSuccess(
        res,
        { deleted: true, id, email: user.email },
        'User permanently deleted from MongoDB'
      );
    } catch (err) {
      next(err);
    }
  }
}

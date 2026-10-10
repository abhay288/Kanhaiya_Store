import React from 'react';
import {
  Wheat,
  Package,
  Droplets,
  Flame,
  Milk,
  Cookie,
  Sparkles,
  ShoppingBag,
  LucideProps,
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  slug: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ slug, size = 20, ...props }) => {
  switch (slug) {
    case 'atta-flours':
      return <Wheat size={size} {...props} />;
    case 'rice-grains':
      return <Package size={size} {...props} />;
    case 'dals-pulses':
      return <Package size={size} {...props} />;
    case 'oils-ghee':
      return <Droplets size={size} {...props} />;
    case 'spices-masalas':
      return <Flame size={size} {...props} />;
    case 'dairy':
      return <Milk size={size} {...props} />;
    case 'snacks':
      return <Cookie size={size} {...props} />;
    case 'cleaning':
      return <Sparkles size={size} {...props} />;
    default:
      return <ShoppingBag size={size} {...props} />;
  }
};

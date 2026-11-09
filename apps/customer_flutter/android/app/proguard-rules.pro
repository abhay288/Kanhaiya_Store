# ProGuard & R8 Optimization Rules for Kanhaiya General Store (Customer App)

# Flutter Engine & Plugins
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Preserve Flutter Native Callbacks & Embeddings
-keepclassmembers class * {
    native <methods>;
}

-keepclassmembers class * extends java.lang.Enum {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# AndroidX Activity & Core
-keep class androidx.activity.** { *; }
-keep class androidx.core.** { *; }

# Google Sign-In & Play Services
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.android.gms.common.annotation.KeepName *;
}
-keepnames class * implements android.os.Parcelable {
    public static final ** CREATOR;
}
-keep class com.google.android.gms.auth.api.signin.** { *; }

# MainActivity
-keep class com.kanhaiya.store.customer.MainActivity { *; }

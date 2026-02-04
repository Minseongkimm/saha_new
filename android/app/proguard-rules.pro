# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native 기본 규칙
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}
-keepclassmembers class * {
  @react.* <methods>;
}
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native 네이티브 모듈
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# MainApplication과 MainActivity
-keep class com.saha.ai.MainApplication { *; }
-keep class com.saha.ai.MainActivity { *; }

# Kakao SDK
-keep class com.kakao.sdk.** { *; }
-dontwarn com.kakao.sdk.**

# Retrofit (generic return type signature is required at runtime)
-keepattributes Signature,Exceptions,InnerClasses,EnclosingMethod,AnnotationDefault,RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,*Annotation*
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keepclassmembers interface * {
    @retrofit2.* <methods>;
}
-keepclassmembers class * {
    @retrofit2.http.* <methods>;
}
-keepclassmembers class com.kakao.sdk.** {
    @retrofit2.* <methods>;
}
-dontwarn retrofit2.**

# 네이티브 메서드
-keepclasseswithmembernames class * {
    native <methods>;
}

# Parcelable
-keepclassmembers class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator CREATOR;
}

# Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# R 클래스
-keepclassmembers class **.R$* {
    public static <fields>;
}

# 네이티브 라이브러리
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

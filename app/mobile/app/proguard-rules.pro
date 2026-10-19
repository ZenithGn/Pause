# Pause – ProGuard/R8 rules
# Supabase Kotlin SDK + serialization
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions
-dontwarn kotlinx.serialization.**
-keepclassmembers class kotlinx.serialization.json.** { *; }
-keep,includedescriptorclasses class com.pause.app.**$$serializer { *; }
-keepclassmembers class com.pause.app.** { *** Companion; }
-keepclasseswithmembers class com.pause.app.** { kotlinx.serialization.KSerializer serializer(...); }

# Koin
-keep class org.koin.** { *; }
-dontwarn org.koin.**

# Ktor / OkHttp
-dontwarn org.slf4j.**
-dontwarn io.ktor.**

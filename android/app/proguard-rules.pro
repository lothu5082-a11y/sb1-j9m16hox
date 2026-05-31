# Keep MediaPipe classes from being stripped during release builds
-keep class com.google.mediapipe.** { *; }
-keep interface com.google.mediapipe.** { *; }
-dontwarn com.google.mediapipe.**

# Keep app classes
-keep class com.vexora.aiassistant.** { *; }

export interface AndroidFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidFile[] = [
  {
    path: 'settings.gradle.kts',
    language: 'kotlin',
    description: 'Gradle project settings and repository configuration',
    content: `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Stash"
include(":app")
`
  },
  {
    path: 'build.gradle.kts',
    language: 'kotlin',
    description: 'Root Gradle build configuration',
    content: `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    id("com.google.devtools.ksp") version "1.9.22-1.0.17" apply false
}
`
  },
  {
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    description: 'App module Gradle build file with Room, Jetpack Compose, and Material 3 dependencies',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.stash.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.stash.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX & Kotlin Coroutines
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Jetpack Compose & Material 3
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Coil for Image Loading in Compose
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Networking & JSON for Secure AI Smart Tagging Backend Proxy
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.10.1")

    // Room Database with SQLite for Persistent Local Storage
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Android Manifest configuring permissions, network security, theme, and main activity',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Internet access for communicating with secure AI Smart Tagging proxy -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Storage permissions for picking photos from device -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

    <application
        android:name=".StashApplication"
        android:allowBackup="true"
        android:usesCleartextTraffic="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Stash">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/Theme.Stash">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`
  },
  {
    path: 'app/src/main/java/com/stash/app/StashApplication.kt',
    language: 'kotlin',
    description: 'Application class initializing Room SQLite database and AiTaggingService singletons',
    content: `package com.stash.app

import android.app.Application
import com.stash.app.data.local.StashDatabase
import com.stash.app.data.remote.AiSummaryService
import com.stash.app.data.remote.AiTaggingService
import com.stash.app.data.repository.StashRepository

/**
 * Application class to initialize the local Room SQLite database,
 * StashRepository, and secure AI service singletons. Survives app lifecycle.
 */
class StashApplication : Application() {

    // Lazy initialization of the persistent Room SQLite database
    val database: StashDatabase by lazy {
        StashDatabase.getDatabase(this)
    }

    // Repository for clean architecture data access
    val repository: StashRepository by lazy {
        StashRepository(database.stashDao())
    }

    // Secure AI Smart Tagging service communicating with server proxy
    val aiTaggingService: AiTaggingService by lazy {
        AiTaggingService()
    }

    // Secure AI Quick Summaries service communicating with server proxy
    val aiSummaryService: AiSummaryService by lazy {
        AiSummaryService()
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/data/model/StashItem.kt',
    language: 'kotlin',
    description: 'Room Entity representing a saved note, link, or image with SQLite table schema',
    content: `package com.stash.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

/**
 * Supported item types in Stash inbox.
 */
enum class ItemType {
    NOTE,
    LINK,
    IMAGE
}

/**
 * Room SQLite Entity: Represents an item stored in the local "stash_items" table.
 *
 * Each item has:
 * - A unique ID (UUID string)
 * - An item type (NOTE, LINK, or IMAGE)
 * - A title
 * - Content (Note body, link URL, or image caption)
 * - Image URI (local storage or ContentResolver URI)
 * - Tags list (converted via Room TypeConverter)
 * - Created and updated timestamps
 * - Archived status flag
 */
@Entity(tableName = "stash_items")
data class StashItem(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val type: ItemType,
    val title: String,
    val contentOrUrl: String,
    val imageUri: String? = null,
    val tags: List<String> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isArchived: Boolean = false,
    val isPinned: Boolean = false,
    val summary: String? = null,
    val keyTakeaways: List<String> = emptyList(),
    val summaryGeneratedAt: Long? = null,
    val summarySourceNote: String? = null
)
`
  },
  {
    path: 'app/src/main/java/com/stash/app/data/local/Converters.kt',
    language: 'kotlin',
    description: 'Room TypeConverters for storing List<String> tags and ItemType enums in SQLite',
    content: `package com.stash.app.data.local

import androidx.room.TypeConverter
import com.stash.app.data.model.ItemType

/**
 * Room TypeConverter: Room only understands primitive SQLite types.
 * These converters serialize List<String> and Enums into text/strings.
 */
class Converters {

    @TypeConverter
    fun fromTagsList(tags: List<String>?): String {
        if (tags.isNullOrEmpty()) return ""
        return tags.joinToString(separator = ",")
    }

    @TypeConverter
    fun toTagsList(data: String?): List<String> {
        if (data.isNullOrBlank()) return emptyList()
        return data.split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
    }

    @TypeConverter
    fun fromItemType(type: ItemType): String {
        return type.name
    }

    @TypeConverter
    fun toItemType(data: String): ItemType {
        return try {
            ItemType.valueOf(data)
        } catch (e: Exception) {
            ItemType.NOTE
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/data/local/StashDao.kt',
    language: 'kotlin',
    description: 'Room Data Access Object (DAO) providing asynchronous SQLite queries and mutations via Flow',
    content: `package com.stash.app.data.local

import androidx.room.*
import com.stash.app.data.model.ItemType
import com.stash.app.data.model.StashItem
import kotlinx.coroutines.flow.Flow

/**
 * Room DAO: Defines SQLite database operations.
 * Methods return Kotlin Coroutines Flow, so the UI automatically updates
 * whenever the SQLite database changes!
 */
@Dao
interface StashDao {

    // Get active (unarchived) items, sorted by pinned first, then newest update time
    @Query("SELECT * FROM stash_items WHERE isArchived = 0 ORDER BY isPinned DESC, updatedAt DESC")
    fun getActiveItems(): Flow<List<StashItem>>

    // Get archived items, sorted by newest update time
    @Query("SELECT * FROM stash_items WHERE isArchived = 1 ORDER BY updatedAt DESC")
    fun getArchivedItems(): Flow<List<StashItem>>

    // Get a specific item by its unique ID
    @Query("SELECT * FROM stash_items WHERE id = :id LIMIT 1")
    suspend fun getItemById(id: String): StashItem?

    // Insert or replace an item in SQLite
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: StashItem)

    // Update an existing item
    @Update
    suspend fun updateItem(item: StashItem)

    // Delete an item permanently from SQLite
    @Delete
    suspend fun deleteItem(item: StashItem)

    // Pin or unpin an item
    @Query("UPDATE stash_items SET isPinned = :isPinned, updatedAt = :timestamp WHERE id = :id")
    suspend fun setPinnedStatus(id: String, isPinned: Boolean, timestamp: Long = System.currentTimeMillis())

    // Archive or unarchive an item
    @Query("UPDATE stash_items SET isArchived = :isArchived, updatedAt = :timestamp WHERE id = :id")
    suspend fun setArchivedStatus(id: String, isArchived: Boolean, timestamp: Long = System.currentTimeMillis())

    // Update AI Summary on item
    @Query("UPDATE stash_items SET summary = :summary, summaryGeneratedAt = :generatedAt, summarySourceNote = :sourceNote, updatedAt = :timestamp WHERE id = :id")
    suspend fun updateSummary(id: String, summary: String?, generatedAt: Long?, sourceNote: String?, timestamp: Long = System.currentTimeMillis())

    // Search query across title and content
    @Query("""
        SELECT * FROM stash_items 
        WHERE isArchived = :isArchived 
        AND (title LIKE '%' || :query || '%' OR contentOrUrl LIKE '%' || :query || '%')
        ORDER BY isPinned DESC, updatedAt DESC
    """)
    fun searchItems(query: String, isArchived: Boolean): Flow<List<StashItem>>
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/data/local/StashDatabase.kt',
    language: 'kotlin',
    description: 'Room SQLite Database singleton with schema setup and seed data',
    content: `package com.stash.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.sqlite.db.SupportSQLiteDatabase
import com.stash.app.data.model.ItemType
import com.stash.app.data.model.StashItem
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Room Database: The central SQLite database instance.
 * Persists data to the device file system ("stash_database.db").
 * Data safely survives app restarts, device reboots, and updates.
 */
@Database(entities = [StashItem::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class StashDatabase : RoomDatabase() {

    abstract fun stashDao(): StashDao

    companion object {
        @Volatile
        private var INSTANCE: StashDatabase? = null

        fun getDatabase(context: Context): StashDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    StashDatabase::class.java,
                    "stash_database.db"
                )
                // Seed initial friendly items on first database creation
                .addCallback(object : Callback() {
                    override fun onCreate(db: SupportSQLiteDatabase) {
                        super.onCreate(db)
                        INSTANCE?.let { database ->
                            CoroutineScope(Dispatchers.IO).launch {
                                populateInitialData(database.stashDao())
                            }
                        }
                    }
                })
                .fallbackToDestructiveMigration()
                .build()

                INSTANCE = instance
                instance
            }
        }

        private suspend fun populateInitialData(dao: StashDao) {
            val now = System.currentTimeMillis()
            dao.insertItem(
                StashItem(
                    title = "Welcome to Stash!",
                    contentOrUrl = "Stash is your private, local save-for-later inbox for notes, links, and pictures. Everything is stored persistently in local SQLite Room.",
                    type = ItemType.NOTE,
                    tags = listOf("welcome", "guide"),
                    createdAt = now - 3600000,
                    updatedAt = now - 3600000,
                    isArchived = false
                )
            )
            dao.insertItem(
                StashItem(
                    title = "Jetpack Compose Documentation",
                    contentOrUrl = "https://developer.android.com/develop/ui/compose",
                    type = ItemType.LINK,
                    tags = listOf("android", "compose"),
                    createdAt = now - 1800000,
                    updatedAt = now - 1800000,
                    isArchived = false
                )
            )
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/data/repository/StashRepository.kt',
    language: 'kotlin',
    description: 'Repository layer mediating between Room DAO and ViewModels',
    content: `package com.stash.app.data.repository

import com.stash.app.data.local.StashDao
import com.stash.app.data.model.StashItem
import kotlinx.coroutines.flow.Flow

/**
 * Repository: Single source of truth for Stash data.
 * Adheres to Android Clean Architecture recommendations.
 */
class StashRepository(private val dao: StashDao) {

    val activeItems: Flow<List<StashItem>> = dao.getActiveItems()

    val archivedItems: Flow<List<StashItem>> = dao.getArchivedItems()

    suspend fun getItemById(id: String): StashItem? {
        return dao.getItemById(id)
    }

    suspend fun saveItem(item: StashItem) {
        dao.insertItem(item)
    }

    suspend fun deleteItem(item: StashItem) {
        dao.deleteItem(item)
    }

    suspend fun setPinned(id: String, isPinned: Boolean) {
        dao.setPinnedStatus(id, isPinned)
    }

    suspend fun setArchived(id: String, isArchived: Boolean) {
        dao.setArchivedStatus(id, isArchived)
    }

    suspend fun updateSummary(id: String, summary: String?, generatedAt: Long?, sourceNote: String?) {
        dao.updateSummary(id, summary, generatedAt, sourceNote)
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/data/remote/AiTaggingService.kt',
    language: 'kotlin',
    description: 'Secure AI Smart Tagging client connecting to backend proxy (no hardcoded API keys)',
    content: `package com.stash.app.data.remote

import com.google.gson.Gson
import com.stash.app.data.model.ItemType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Payload sent to the secure backend proxy.
 */
data class AiTagRequest(
    val type: String,
    val title: String,
    val contentOrUrl: String,
    val imageUri: String? = null,
    val existingTags: List<String> = emptyList()
)

/**
 * Response received from the secure backend proxy.
 */
data class AiTagResponse(
    val success: Boolean,
    val tags: List<String>?,
    val error: String?,
    val analysisNotes: String?,
    val imageAnalysisReliable: Boolean?,
    val limitationExplanation: String?
)

/**
 * Result returned to ViewModel and Jetpack Compose UI.
 */
data class AiTagResult(
    val suggestedTags: List<String>,
    val analysisNotes: String? = null,
    val limitationNotice: String? = null
)

/**
 * AiTaggingService: Connects to the secure backend proxy to generate intelligent tag suggestions.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * Android client apps must NEVER hardcode secret AI API keys (such as Gemini or OpenAI keys)
 * directly into Kotlin/Java source code or APK assets. Any APK can be decompiled to extract raw strings.
 *
 * Supported production architectures:
 * 1. Secure Backend Proxy (implemented here): The Android client communicates with a backend proxy
 *    (Node.js/Express, Cloud Run, or Cloud Functions) which holds GEMINI_API_KEY securely in server secrets.
 * 2. On-Device AI via Android AICore / Gemini Nano: For offline execution on supported devices (Pixel 8+, S24+).
 * 3. Firebase Vertex AI with App Check: Attests that requests originate from authentic Android app instances.
 */
class AiTaggingService(
    // 10.0.2.2 is the standard Android Emulator alias for localhost on the host machine
    private val backendBaseUrl: String = "http://10.0.2.2:3000"
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun suggestTags(
        type: ItemType,
        title: String,
        contentOrUrl: String,
        imageUri: String? = null,
        existingTags: List<String> = emptyList()
    ): Result<AiTagResult> = withContext(Dispatchers.IO) {
        try {
            val typeString = when (type) {
                ItemType.NOTE -> "note"
                ItemType.LINK -> "link"
                ItemType.IMAGE -> "image"
            }

            val requestPayload = AiTagRequest(
                type = typeString,
                title = title.trim(),
                contentOrUrl = contentOrUrl.trim(),
                imageUri = imageUri,
                existingTags = existingTags
            )

            val requestBody = gson.toJson(requestPayload).toRequestBody(jsonMediaType)
            val request = Request.Builder()
                .url("$backendBaseUrl/api/ai/suggest-tags")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (!response.isSuccessful) {
                val errorMsg = if (!responseBody.isNullOrBlank()) {
                    try {
                        val parsed = gson.fromJson(responseBody, AiTagResponse::class.java)
                        parsed.error ?: "AI request failed with HTTP \${response.code}"
                    } catch (e: Exception) {
                        "Server returned HTTP \${response.code}"
                    }
                } else {
                    "AI request failed with HTTP \${response.code}"
                }
                return@withContext Result.failure(IOException(errorMsg))
            }

            if (responseBody.isNullOrBlank()) {
                return@withContext Result.failure(IOException("Empty response from AI service"))
            }

            val parsed = gson.fromJson(responseBody, AiTagResponse::class.java)
            if (!parsed.success) {
                return@withContext Result.failure(IOException(parsed.error ?: "Failed to generate AI tags"))
            }

            Result.success(
                AiTagResult(
                    suggestedTags = parsed.tags ?: emptyList(),
                    analysisNotes = parsed.analysisNotes,
                    limitationNotice = parsed.limitationExplanation
                )
            )
        } catch (e: Exception) {
            val friendly = when {
                e is java.net.ConnectException ->
                    "Cannot reach AI backend at $backendBaseUrl. Ensure the Stash proxy server is running."
                e.message?.contains("GEMINI_API_KEY") == true ->
                    e.message ?: "AI service not configured: Missing GEMINI_API_KEY."
                else ->
                    "AI tagging error: \${e.localizedMessage ?: "Unknown error"}"
            }
            Result.failure(IOException(friendly, e))
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/data/remote/AiSummaryService.kt',
    language: 'kotlin',
    description: 'Secure AI Quick Summaries client connecting to server-side Gemini proxy (no hardcoded API keys in APK)',
    content: `package com.stash.app.data.remote

import com.google.gson.Gson
import com.stash.app.data.model.ItemType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Payload sent to backend proxy for AI summarization.
 */
data class AiSummaryRequest(
    val id: String,
    val type: String,
    val title: String,
    val contentOrUrl: String,
    val imageUri: String? = null
)

/**
 * Response received from backend proxy.
 */
data class AiSummaryResponse(
    val success: Boolean,
    val summary: String?,
    val keyTakeaways: List<String>?,
    val sourceExplanation: String?,
    val generatedAt: Long?,
    val cannotFetchUrl: Boolean?,
    val error: String?
)

/**
 * Result returned to ViewModel and Jetpack Compose UI.
 */
data class AiSummaryResult(
    val summary: String,
    val keyTakeaways: List<String> = emptyList(),
    val sourceExplanation: String? = null,
    val generatedAt: Long = System.currentTimeMillis()
)

/**
 * AiSummaryService: Connects to the secure backend proxy to generate concise executive summaries.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * Android client apps must NEVER hardcode secret AI API keys directly into Kotlin source code or APK assets.
 * APK binaries can easily be decompiled with tools like JADX to extract raw keys.
 * Stash routes all Gemini AI summarization through a trusted server proxy holding GEMINI_API_KEY in server secrets.
 */
class AiSummaryService(
    // 10.0.2.2 is the Android Emulator alias for localhost on the host machine
    private val backendBaseUrl: String = "http://10.0.2.2:3000"
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun summarize(
        id: String,
        type: ItemType,
        title: String,
        contentOrUrl: String,
        imageUri: String? = null
    ): Result<AiSummaryResult> = withContext(Dispatchers.IO) {
        try {
            val typeString = when (type) {
                ItemType.NOTE -> "note"
                ItemType.LINK -> "link"
                ItemType.IMAGE -> "image"
            }

            val requestPayload = AiSummaryRequest(
                id = id,
                type = typeString,
                title = title.trim(),
                contentOrUrl = contentOrUrl.trim(),
                imageUri = imageUri
            )

            val jsonBody = gson.toJson(requestPayload)
            val request = Request.Builder()
                .url("$backendBaseUrl/api/ai/summarize")
                .post(jsonBody.toRequestBody(jsonMediaType))
                .build()

            val response = client.newCall(request).execute()
            val responseString = response.body?.string().orEmpty()

            val parsed = gson.fromJson(responseString, AiSummaryResponse::class.java)

            if (!response.isSuccessful || parsed == null || !parsed.success) {
                val errorMsg = parsed?.error ?: "Server returned error code \${response.code}"
                return@withContext Result.failure(IOException(errorMsg))
            }

            val summaryText = parsed.summary
            if (summaryText.isNullOrBlank()) {
                return@withContext Result.failure(IOException("No summary text produced by model."))
            }

            Result.success(
                AiSummaryResult(
                    summary = summaryText,
                    keyTakeaways = parsed.keyTakeaways ?: emptyList(),
                    sourceExplanation = parsed.sourceExplanation,
                    generatedAt = parsed.generatedAt ?: System.currentTimeMillis()
                )
            )
        } catch (e: Exception) {
            val friendly = when {
                e is java.net.ConnectException ->
                    "Cannot reach AI backend at $backendBaseUrl. Ensure the local Stash backend server is running."
                e.message?.contains("GEMINI_API_KEY") == true ->
                    e.message ?: "AI service not configured: Missing GEMINI_API_KEY in environment secrets."
                else ->
                    e.localizedMessage ?: "Unknown AI summarizer error"
            }
            Result.failure(IOException(friendly, e))
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/StashViewModel.kt',
    language: 'kotlin',
    description: 'ViewModel managing UI State, searching, filtering, Room database, and AI tag suggestions',
    content: `package com.stash.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.stash.app.data.model.ItemType
import com.stash.app.data.model.StashItem
import com.stash.app.data.remote.AiSummaryService
import com.stash.app.data.remote.AiTaggingService
import com.stash.app.data.repository.StashRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * Filter parameters for the Stash inbox & archived views.
 */
data class FilterState(
    val searchQuery: String = "",
    val selectedType: ItemType? = null,
    val selectedTag: String? = null
)

/**
 * StashViewModel: Exposes state flows to Jetpack Compose UI.
 * Handles item validation, filtering, search, SQLite Room operations,
 * intelligent AI Smart Tagging suggestions, and AI Quick Summaries.
 */
class StashViewModel(
    private val repository: StashRepository,
    private val aiTaggingService: AiTaggingService = AiTaggingService(),
    private val aiSummaryService: AiSummaryService = AiSummaryService()
) : ViewModel() {

    private val _filterState = MutableStateFlow(FilterState())
    val filterState: StateFlow<FilterState> = _filterState.asStateFlow()

    // Active inbox items combined with filter & search criteria
    val filteredActiveItems: StateFlow<List<StashItem>> = combine(
        repository.activeItems,
        _filterState
    ) { items, filter ->
        filterItems(items, filter)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Archived items combined with filter & search criteria
    val filteredArchivedItems: StateFlow<List<StashItem>> = combine(
        repository.archivedItems,
        _filterState
    ) { items, filter ->
        filterItems(items, filter)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // All available unique tags from active items
    val availableTags: StateFlow<List<String>> = repository.activeItems.map { items ->
        items.flatMap { it.tags }.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // AI Smart Tagging states
    private val _isAiLoading = MutableStateFlow(false)
    val isAiLoading: StateFlow<Boolean> = _isAiLoading.asStateFlow()

    private val _aiSuggestedTags = MutableStateFlow<List<String>>(emptyList())
    val aiSuggestedTags: StateFlow<List<String>> = _aiSuggestedTags.asStateFlow()

    private val _aiError = MutableStateFlow<String?>(null)
    val aiError: StateFlow<String?> = _aiError.asStateFlow()

    private val _aiLimitationNotice = MutableStateFlow<String?>(null)
    val aiLimitationNotice: StateFlow<String?> = _aiLimitationNotice.asStateFlow()

    private fun filterItems(items: List<StashItem>, filter: FilterState): List<StashItem> {
        return items.filter { item ->
            val matchesType = filter.selectedType == null || item.type == filter.selectedType
            val matchesTag = filter.selectedTag == null || item.tags.contains(filter.selectedTag)
            val matchesQuery = filter.searchQuery.isBlank() ||
                    item.title.contains(filter.searchQuery, ignoreCase = true) ||
                    item.contentOrUrl.contains(filter.searchQuery, ignoreCase = true) ||
                    item.tags.any { it.contains(filter.searchQuery, ignoreCase = true) }

            matchesType && matchesTag && matchesQuery
        }
    }

    fun updateSearchQuery(query: String) {
        _filterState.update { it.copy(searchQuery = query) }
    }

    fun selectType(type: ItemType?) {
        _filterState.update { it.copy(selectedType = if (it.selectedType == type) null else type) }
    }

    fun selectTag(tag: String?) {
        _filterState.update { it.copy(selectedTag = if (it.selectedTag == tag) null else tag) }
    }

    fun clearFilters() {
        _filterState.update { FilterState() }
    }

    // AI Smart Tagging actions
    fun requestAiTagSuggestions(
        type: ItemType,
        title: String,
        contentOrUrl: String,
        imageUri: String? = null,
        existingTags: List<String> = emptyList()
    ) {
        if (title.isBlank() && contentOrUrl.isBlank() && imageUri.isNullOrBlank()) {
            _aiError.value = "Please enter a title, note content, or link URL first."
            return
        }

        viewModelScope.launch {
            _isAiLoading.value = true
            _aiError.value = null
            _aiLimitationNotice.value = null

            val result = aiTaggingService.suggestTags(
                type = type,
                title = title,
                contentOrUrl = contentOrUrl,
                imageUri = imageUri,
                existingTags = existingTags
            )

            result.fold(
                onSuccess = { tagResult ->
                    val existingNormalized = existingTags.map { it.trim().lowercase() }.toSet()
                    val filtered = tagResult.suggestedTags
                        .map { it.trim().lowercase().removePrefix("#") }
                        .filter { it.isNotBlank() && !existingNormalized.contains(it) }
                        .distinct()

                    _aiSuggestedTags.value = filtered
                    _aiLimitationNotice.value = tagResult.limitationNotice
                },
                onFailure = { error ->
                    _aiSuggestedTags.value = emptyList()
                    _aiError.value = error.message ?: "Failed to generate AI tag suggestions."
                }
            )
            _isAiLoading.value = false
        }
    }

    fun acceptAiTag(tag: String, currentTags: List<String>): List<String> {
        val clean = tag.trim().lowercase().removePrefix("#")
        val updated = if (currentTags.none { it.trim().lowercase() == clean }) {
            currentTags + clean
        } else {
            currentTags
        }
        _aiSuggestedTags.update { it.filter { t -> t.trim().lowercase() != clean } }
        return updated
    }

    fun rejectAiTag(tag: String) {
        val clean = tag.trim().lowercase().removePrefix("#")
        _aiSuggestedTags.update { it.filter { t -> t.trim().lowercase() != clean } }
    }

    fun acceptAllAiTags(currentTags: List<String>): List<String> {
        val currentNormalized = currentTags.map { it.trim().lowercase() }.toMutableSet()
        val toAdd = mutableListOf<String>()

        _aiSuggestedTags.value.forEach { tag ->
            val clean = tag.trim().lowercase().removePrefix("#")
            if (clean.isNotBlank() && !currentNormalized.contains(clean)) {
                currentNormalized.add(clean)
                toAdd.add(clean)
            }
        }
        _aiSuggestedTags.value = emptyList()
        return currentTags + toAdd
    }

    fun dismissAllAiTags() {
        _aiSuggestedTags.value = emptyList()
    }

    fun clearAiError() {
        _aiError.value = null
    }

    // AI Quick Summaries states
    private val _isSummaryLoading = MutableStateFlow(false)
    val isSummaryLoading: StateFlow<Boolean> = _isSummaryLoading.asStateFlow()

    private val _summaryError = MutableStateFlow<String?>(null)
    val summaryError: StateFlow<String?> = _summaryError.asStateFlow()

    private val _cannotFetchUrlNotice = MutableStateFlow<String?>(null)
    val cannotFetchUrlNotice: StateFlow<String?> = _cannotFetchUrlNotice.asStateFlow()

    fun requestAiSummary(item: StashItem) {
        viewModelScope.launch {
            _isSummaryLoading.value = true
            _summaryError.value = null
            _cannotFetchUrlNotice.value = null

            // For links: check if content is solely a URL
            if (item.type == ItemType.LINK) {
                val isPureUrl = item.contentOrUrl.trim().startsWith("http") && !item.contentOrUrl.trim().contains(" ")
                if (isPureUrl) {
                    _cannotFetchUrlNotice.value = "External webpage content cannot be read from the URL alone. Stash does not silently crawl external sites without permissions. You can paste the article text into this item to generate an AI summary."
                    _isSummaryLoading.value = false
                    return@launch
                }
            }

            val result = aiSummaryService.summarize(
                id = item.id,
                type = item.type,
                title = item.title,
                contentOrUrl = item.contentOrUrl,
                imageUri = item.imageUri
            )

            result.fold(
                onSuccess = { summaryResult ->
                    // Persist to local SQLite Room database!
                    val updated = item.copy(
                        summary = summaryResult.summary,
                        keyTakeaways = summaryResult.keyTakeaways,
                        summaryGeneratedAt = summaryResult.generatedAt,
                        summarySourceNote = summaryResult.sourceExplanation,
                        updatedAt = System.currentTimeMillis()
                    )
                    repository.saveItem(updated)
                },
                onFailure = { error ->
                    _summaryError.value = error.message ?: "Failed to generate AI summary."
                }
            )
            _isSummaryLoading.value = false
        }
    }

    fun removeSummary(itemId: String) {
        viewModelScope.launch {
            val item = repository.getItemById(itemId)
            if (item != null) {
                val updated = item.copy(
                    summary = null,
                    keyTakeaways = emptyList(),
                    summaryGeneratedAt = null,
                    summarySourceNote = null,
                    updatedAt = System.currentTimeMillis()
                )
                repository.saveItem(updated)
            }
        }
    }

    fun clearSummaryError() {
        _summaryError.value = null
    }

    fun clearCannotFetchUrlNotice() {
        _cannotFetchUrlNotice.value = null
    }

    // CRUD and Archive Operations
    fun saveItem(item: StashItem) {
        viewModelScope.launch {
            repository.saveItem(item)
        }
    }

    fun togglePin(item: StashItem) {
        viewModelScope.launch {
            repository.setPinned(item.id, !item.isPinned)
        }
    }

    fun archiveItem(id: String) {
        viewModelScope.launch {
            repository.setArchived(id, isArchived = true)
        }
    }

    fun restoreItem(id: String) {
        viewModelScope.launch {
            repository.setArchived(id, isArchived = false)
        }
    }

    fun deleteItem(item: StashItem) {
        viewModelScope.launch {
            repository.deleteItem(item)
        }
    }
}

class StashViewModelFactory(
    private val repository: StashRepository,
    private val aiTaggingService: AiTaggingService = AiTaggingService(),
    private val aiSummaryService: AiSummaryService = AiSummaryService()
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(StashViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return StashViewModel(repository, aiTaggingService, aiSummaryService) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/theme/Color.kt',
    language: 'kotlin',
    description: 'Material 3 color palette for Stash (clean indigo/slate palette)',
    content: `package com.stash.app.ui.theme

import androidx.compose.ui.graphics.Color

val PrimaryIndigo = Color(0xFF4F46E5)
val PrimaryIndigoVariant = Color(0xFF4338CA)
val SecondaryTeal = Color(0xFF0D9488)
val BackgroundLight = Color(0xFFF8FAFC)
val SurfaceLight = Color(0xFFFFFFFF)
val TextPrimary = Color(0xFF0F172A)
val TextSecondary = Color(0xFF64748B)
val BorderSubtle = Color(0xFFE2E8F0)
val DangerRed = Color(0xFFDC2626)
val SuccessGreen = Color(0xFF16A34A)
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/theme/Theme.kt',
    language: 'kotlin',
    description: 'Material 3 theme setup with dynamic color and light/dark color schemes',
    content: `package com.stash.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = PrimaryIndigo,
    onPrimary = Color.White,
    secondary = SecondaryTeal,
    onSecondary = Color.White,
    background = BackgroundLight,
    surface = SurfaceLight,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    outline = BorderSubtle
)

@Composable
fun StashTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography(),
        content = content
    )
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/components/StashItemCard.kt',
    language: 'kotlin',
    description: 'Compose Card displaying Note, Link, or Image with tags, timestamps, and actions',
    content: `package com.stash.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.stash.app.data.model.ItemType
import com.stash.app.data.model.StashItem
import java.text.SimpleDateFormat
import java.util.*

/**
 * Modern Material 3 Card component for a saved item.
 * Displays type icon, title, snippet or image preview, tags, timestamp,
 * and quick archive/delete actions.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun StashItemCard(
    item: StashItem,
    onItemClick: () -> Unit,
    onPinClick: () -> Unit = {},
    onArchiveClick: () -> Unit,
    onDeleteClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val dateFormatter = SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
    val formattedDate = dateFormatter.format(Date(item.createdAt))

    Card(
        onClick = onItemClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Top Row: Type Badge + Title + Quick Actions
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Type Icon
                val icon = when (item.type) {
                    ItemType.NOTE -> Icons.Default.Description
                    ItemType.LINK -> Icons.Default.Link
                    ItemType.IMAGE -> Icons.Default.Image
                }
                val iconTint = when (item.type) {
                    ItemType.NOTE -> Color(0xFF6366F1)
                    ItemType.LINK -> Color(0xFF0284C7)
                    ItemType.IMAGE -> Color(0xFF059669)
                }

                Icon(
                    imageVector = icon,
                    contentDescription = item.type.name,
                    tint = iconTint,
                    modifier = Modifier.size(20.dp)
                )

                Spacer(modifier = Modifier.width(8.dp))

                Text(
                    text = item.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                // Pin / Unpin Icon
                IconButton(onClick = onPinClick, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = if (item.isPinned) Icons.Default.PushPin else Icons.Outlined.PushPin,
                        contentDescription = if (item.isPinned) "Unpin" else "Pin to top",
                        tint = if (item.isPinned) Color(0xFF4F46E5) else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Archive / Restore Icon
                IconButton(onClick = onArchiveClick, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = if (item.isArchived) Icons.Default.Unarchive else Icons.Outlined.Archive,
                        contentDescription = if (item.isArchived) "Restore" else "Archive",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Delete Icon
                IconButton(onClick = onDeleteClick, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Outlined.Delete,
                        contentDescription = "Delete",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Body preview depending on type
            when (item.type) {
                ItemType.NOTE -> {
                    if (item.contentOrUrl.isNotBlank()) {
                        Text(
                            text = item.contentOrUrl,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                    }
                }
                ItemType.LINK -> {
                    Text(
                        text = item.contentOrUrl,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF0284C7),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }
                ItemType.IMAGE -> {
                    item.imageUri?.let { uri ->
                        AsyncImage(
                            model = uri,
                            contentDescription = item.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .clip(RoundedCornerShape(12.dp))
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                    }
                }
            }

            // Tags row
            if (item.tags.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item.tags.forEach { tag ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                        ) {
                            Text(
                                text = "#$tag",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Bottom Row: Summary Badge + Timestamp
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Saved $formattedDate",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )

                if (!item.summary.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFF3E8FF),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDDD6FE))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = "AI Summary",
                                tint = Color(0xFF7E22CE),
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Summary",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF6B21A8),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/screens/HomeScreen.kt',
    language: 'kotlin',
    description: 'Inbox screen with search, type filter chips, tags, and animated list of cards',
    content: `package com.stash.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.stash.app.data.model.ItemType
import com.stash.app.data.model.StashItem
import com.stash.app.ui.StashViewModel
import com.stash.app.ui.components.StashItemCard

/**
 * HomeScreen: Main Inbox Screen.
 * Contains:
 * - Search bar with instant filtering
 * - Type chips: All, Notes, Links, Images
 * - Tag chips
 * - LazyColumn of active items
 * - Friendly Empty State when no items match
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: StashViewModel,
    onNavigateToAdd: () -> Unit,
    onNavigateToEdit: (String) -> Unit
) {
    val items by viewModel.filteredActiveItems.collectAsState()
    val filterState by viewModel.filterState.collectAsState()
    val availableTags by viewModel.availableTags.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stash Inbox") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToAdd,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add New Item")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search Input with Natural Language Search
            OutlinedTextField(
                value = filterState.searchQuery,
                onValueChange = { viewModel.updateSearchQuery(it) },
                placeholder = { Text("Search naturally (e.g. 'C programming notes', 'pinned links')...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Natural Language Search") },
                trailingIcon = {
                    if (filterState.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.updateSearchQuery("") }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear search")
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Filter Chips by Type
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 6.dp)
            ) {
                item {
                    FilterChip(
                        selected = filterState.selectedType == null,
                        onClick = { viewModel.selectType(null) },
                        label = { Text("All Items") }
                    )
                }
                item {
                    FilterChip(
                        selected = filterState.selectedType == ItemType.NOTE,
                        onClick = { viewModel.selectType(ItemType.NOTE) },
                        label = { Text("Notes") }
                    )
                }
                item {
                    FilterChip(
                        selected = filterState.selectedType == ItemType.LINK,
                        onClick = { viewModel.selectType(ItemType.LINK) },
                        label = { Text("Links") }
                    )
                }
                item {
                    FilterChip(
                        selected = filterState.selectedType == ItemType.IMAGE,
                        onClick = { viewModel.selectType(ItemType.IMAGE) },
                        label = { Text("Images") }
                    )
                }
            }

            // Available Tag Chips
            if (availableTags.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    items(availableTags) { tag ->
                        FilterChip(
                            selected = filterState.selectedTag == tag,
                            onClick = { viewModel.selectTag(tag) },
                            label = { Text("#$tag") }
                        )
                    }
                }
            }

            // Items List or Friendly Empty State
            if (items.isEmpty()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Inbox,
                            contentDescription = "Empty Inbox",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = if (filterState.searchQuery.isNotEmpty() || filterState.selectedType != null)
                                "Nothing found this time. Try different words?"
                            else
                                "Your Stash is waiting for its first little treasure ✨",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = if (filterState.searchQuery.isNotEmpty())
                                "Try searching by type (e.g. 'notes', 'links'), tags, or broader keywords."
                            else
                                "Tap the quick actions or + button to save your first note, link, or photo.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                val pinned = items.filter { it.isPinned }
                val regular = items.filter { !it.isPinned }

                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    if (pinned.isNotEmpty()) {
                        item {
                            Text(
                                text = "PINNED (\${pinned.size})",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }
                        items(pinned, key = { it.id }) { item ->
                            StashItemCard(
                                item = item,
                                onItemClick = { onNavigateToEdit(item.id) },
                                onPinClick = { viewModel.togglePin(item) },
                                onArchiveClick = { viewModel.archiveItem(item.id) },
                                onDeleteClick = { viewModel.deleteItem(item) }
                            )
                        }
                    }

                    if (regular.isNotEmpty()) {
                        if (pinned.isNotEmpty()) {
                            item {
                                Text(
                                    text = "OTHER ITEMS (\${regular.size})",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                                )
                            }
                        }
                        items(regular, key = { it.id }) { item ->
                            StashItemCard(
                                item = item,
                                onItemClick = { onNavigateToEdit(item.id) },
                                onPinClick = { viewModel.togglePin(item) },
                                onArchiveClick = { viewModel.archiveItem(item.id) },
                                onDeleteClick = { viewModel.deleteItem(item) }
                            )
                        }
                    }
                }
            }
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/screens/AddEditScreen.kt',
    language: 'kotlin',
    description: 'Create and Edit screen with input validation and AI Smart Tagging chips',
    content: `package com.stash.app.ui.screens

import android.net.Uri
import android.webkit.URLUtil
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.stash.app.data.model.ItemType
import com.stash.app.data.model.StashItem
import com.stash.app.ui.StashViewModel

/**
 * AddEditScreen: Clean form for creating or modifying a Stash item.
 * Features:
 * - Title and URL validation
 * - Android Photo Picker for local images
 * - AI Smart Tagging with user approval:
 *   - "Suggest tags with AI" action
 *   - Selectable suggestion chips with accept and reject buttons
 *   - Duplicate prevention (ignoring case and whitespace)
 *   - Preserves all existing tags
 *   - Graceful offline/missing configuration error reporting
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddEditScreen(
    itemId: String?,
    viewModel: StashViewModel,
    onNavigateBack: () -> Unit
) {
    var itemType by remember { mutableStateOf(ItemType.NOTE) }
    var title by remember { mutableStateOf("") }
    var contentOrUrl by remember { mutableStateOf("") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var tagsList by remember { mutableStateOf<List<String>>(emptyList()) }
    var manualTagInput by remember { mutableStateOf("") }
    var existingCreatedAt by remember { mutableStateOf<Long?>(null) }

    // Validation state
    var titleError by remember { mutableStateOf<String?>(null) }
    var urlError by remember { mutableStateOf<String?>(null) }

    // AI Smart Tagging states from ViewModel
    val isAiLoading by viewModel.isAiLoading.collectAsState()
    val aiSuggestedTags by viewModel.aiSuggestedTags.collectAsState()
    val aiError by viewModel.aiError.collectAsState()
    val aiLimitationNotice by viewModel.aiLimitationNotice.collectAsState()

    // Pre-fill fields if editing existing item
    LaunchedEffect(itemId) {
        if (!itemId.isNullOrBlank()) {
            val item = viewModel.filteredActiveItems.value.find { it.id == itemId }
                ?: viewModel.filteredArchivedItems.value.find { it.id == itemId }
            item?.let {
                itemType = it.type
                title = it.title
                contentOrUrl = it.contentOrUrl
                if (!it.imageUri.isNullOrBlank()) {
                    selectedImageUri = Uri.parse(it.imageUri)
                }
                tagsList = it.tags
                existingCreatedAt = it.createdAt
            }
        }
        viewModel.clearAiError()
        viewModel.dismissAllAiTags()
    }

    // Android Photo Picker
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedImageUri = uri
        }
    }

    fun addManualTag() {
        val clean = manualTagInput.trim().lowercase().removePrefix("#")
        if (clean.isNotBlank() && tagsList.none { it.trim().lowercase() == clean }) {
            tagsList = tagsList + clean
            manualTagInput = ""
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (itemId == null) "New Stash Item" else "Edit Item") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Button(
                        onClick = {
                            var hasError = false
                            if (title.trim().isEmpty()) {
                                titleError = "Title cannot be empty"
                                hasError = true
                            } else {
                                titleError = null
                            }

                            if (itemType == ItemType.LINK) {
                                val trimmed = contentOrUrl.trim()
                                if (trimmed.isEmpty() || !URLUtil.isValidUrl(trimmed)) {
                                    urlError = "Please enter a valid website URL (e.g. https://example.com)"
                                    hasError = true
                                } else {
                                    urlError = null
                                }
                            } else {
                                urlError = null
                            }

                            if (!hasError) {
                                // Commit any pending manual input
                                if (manualTagInput.isNotBlank()) {
                                    val clean = manualTagInput.trim().lowercase().removePrefix("#")
                                    if (clean.isNotBlank() && tagsList.none { it.trim().lowercase() == clean }) {
                                        tagsList = tagsList + clean
                                    }
                                }

                                val now = System.currentTimeMillis()
                                val itemToSave = StashItem(
                                    id = itemId ?: java.util.UUID.randomUUID().toString(),
                                    type = itemType,
                                    title = title.trim(),
                                    contentOrUrl = contentOrUrl.trim(),
                                    imageUri = selectedImageUri?.toString(),
                                    tags = tagsList,
                                    createdAt = existingCreatedAt ?: now,
                                    updatedAt = now,
                                    isArchived = false
                                )
                                viewModel.saveItem(itemToSave)
                                onNavigateBack()
                            }
                        },
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text("Save")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Type Segmented Selector
            Text("Select Type", style = MaterialTheme.typography.labelLarge)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ItemType.values().forEach { type ->
                    FilterChip(
                        selected = itemType == type,
                        onClick = { itemType = type },
                        label = { Text(type.name.lowercase().replaceFirstChar { it.uppercase() }) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Title Field with Error Validation
            OutlinedTextField(
                value = title,
                onValueChange = {
                    title = it
                    if (it.isNotBlank()) titleError = null
                },
                label = { Text("Title *") },
                isError = titleError != null,
                supportingText = {
                    titleError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Content input according to Type
            when (itemType) {
                ItemType.NOTE -> {
                    OutlinedTextField(
                        value = contentOrUrl,
                        onValueChange = { contentOrUrl = it },
                        label = { Text("Note Content") },
                        placeholder = { Text("Write your thoughts, checklist, or summary...") },
                        minLines = 4,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                ItemType.LINK -> {
                    OutlinedTextField(
                        value = contentOrUrl,
                        onValueChange = {
                            contentOrUrl = it
                            urlError = null
                        },
                        label = { Text("Website URL *") },
                        placeholder = { Text("https://example.com/article") },
                        isError = urlError != null,
                        supportingText = {
                            urlError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                ItemType.IMAGE -> {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Select Image from Device", style = MaterialTheme.typography.labelLarge)
                        Button(
                            onClick = {
                                photoPickerLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            }
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (selectedImageUri == null) "Choose Image" else "Change Image")
                        }

                        selectedImageUri?.let { uri ->
                            AsyncImage(
                                model = uri,
                                contentDescription = "Selected Image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp)
                                    .clip(MaterialTheme.shapes.medium)
                            )
                        }

                        OutlinedTextField(
                            value = contentOrUrl,
                            onValueChange = { contentOrUrl = it },
                            label = { Text("Image Caption / Description (Optional)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // Tags & AI Smart Tagging Section
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Tags", style = MaterialTheme.typography.labelLarge)

                    // Suggest Tags with AI Button
                    FilledTonalButton(
                        onClick = {
                            viewModel.requestAiTagSuggestions(
                                type = itemType,
                                title = title,
                                contentOrUrl = contentOrUrl,
                                imageUri = selectedImageUri?.toString(),
                                existingTags = tagsList
                            )
                        },
                        enabled = !isAiLoading,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (isAiLoading) "Analyzing..." else "Suggest tags with AI", style = MaterialTheme.typography.labelMedium)
                    }
                }

                // AI Loading Status
                if (isAiLoading) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFEEF2FF), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Analyzing content with Gemini AI...",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                // AI Error Message
                aiError?.let { err ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = "Notice",
                                tint = Color(0xFFD97706),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "AI Service Notice",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color(0xFF92400E)
                                )
                                Text(
                                    text = err,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFFB45309)
                                )
                            }
                            IconButton(onClick = { viewModel.clearAiError() }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Dismiss", modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                // AI Suggested Tags Card
                if (aiSuggestedTags.isNotEmpty()) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F3FF)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = Color(0xFF6D28D9),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "AI Suggested Tags (\${aiSuggestedTags.size})",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Color(0xFF4C1D95)
                                    )
                                }
                                Row {
                                    TextButton(
                                        onClick = { tagsList = viewModel.acceptAllAiTags(tagsList) },
                                        contentPadding = PaddingValues(horizontal = 8.dp)
                                    ) {
                                        Text("+ Accept All", style = MaterialTheme.typography.labelSmall)
                                    }
                                    TextButton(
                                        onClick = { viewModel.dismissAllAiTags() },
                                        contentPadding = PaddingValues(horizontal = 8.dp)
                                    ) {
                                        Text("Dismiss", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }

                            if (itemType == ItemType.LINK) {
                                Text(
                                    text = "Note: Suggested strictly from title and URL keywords; external page not crawled.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF6B7280),
                                    modifier = Modifier.padding(bottom = 6.dp)
                                )
                            }

                            aiLimitationNotice?.let { notice ->
                                Text(
                                    text = notice,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF92400E),
                                    modifier = Modifier.padding(bottom = 6.dp)
                                )
                            }

                            // Flow of suggested selectable chips
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                aiSuggestedTags.forEach { tag ->
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color.White,
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDDD6FE)),
                                        modifier = Modifier.padding(vertical = 2.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = "#$tag",
                                                style = MaterialTheme.typography.labelMedium,
                                                color = Color(0xFF5B21B6)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            IconButton(
                                                onClick = { tagsList = viewModel.acceptAiTag(tag, tagsList) },
                                                modifier = Modifier.size(20.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Check,
                                                    contentDescription = "Accept $tag",
                                                    tint = Color(0xFF16A34A),
                                                    modifier = Modifier.size(14.dp)
                                                )
                                            }
                                            IconButton(
                                                onClick = { viewModel.rejectAiTag(tag) },
                                                modifier = Modifier.size(20.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Close,
                                                    contentDescription = "Reject $tag",
                                                    tint = Color(0xFF9CA3AF),
                                                    modifier = Modifier.size(14.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Manual Tag Input
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = manualTagInput,
                        onValueChange = { manualTagInput = it },
                        placeholder = { Text("Type tag and tap Add...") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { addManualTag() },
                        enabled = manualTagInput.isNotBlank()
                    ) {
                        Text("Add")
                    }
                }

                // Active Tags Chips
                if (tagsList.isNotEmpty()) {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                    ) {
                        tagsList.forEach { tag ->
                            InputChip(
                                selected = false,
                                onClick = {},
                                label = { Text("#$tag") },
                                trailingIcon = {
                                    IconButton(
                                        onClick = { tagsList = tagsList.filter { it != tag } },
                                        modifier = Modifier.size(16.dp)
                                    ) {
                                        Icon(Icons.Default.Close, contentDescription = "Remove tag", modifier = Modifier.size(12.dp))
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/screens/ArchivedScreen.kt',
    language: 'kotlin',
    description: 'Archived items screen with restore and permanent delete features',
    content: `package com.stash.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.stash.app.ui.StashViewModel
import com.stash.app.ui.components.StashItemCard

/**
 * ArchivedScreen: Displays all archived items.
 * Allows restoring items back to Inbox or permanently deleting them from SQLite.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArchivedScreen(
    viewModel: StashViewModel,
    onNavigateBack: () -> Unit
) {
    val items by viewModel.filteredArchivedItems.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Archived Items") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (items.isEmpty()) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(32.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Archive,
                        contentDescription = "No Archived Items",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                        modifier = Modifier.size(72.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No archived items",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Items you archive from your inbox will appear here.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                items(items, key = { it.id }) { item ->
                    StashItemCard(
                        item = item,
                        onItemClick = {},
                        onArchiveClick = { viewModel.restoreItem(item.id) },
                        onDeleteClick = { viewModel.deleteItem(item) }
                    )
                }
            }
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/ui/screens/ItemDetailScreen.kt',
    language: 'kotlin',
    description: 'Item Detail Screen featuring AI Quick Summaries, key takeaways, regeneration, and preserved original content',
    content: `package com.stash.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.stash.app.data.model.ItemType
import com.stash.app.data.model.StashItem
import com.stash.app.ui.StashViewModel
import java.text.SimpleDateFormat
import java.util.*

/**
 * ItemDetailScreen: Shows full saved item details and the AI Quick Summaries section.
 *
 * Requirements fulfilled:
 * - "Summarize with AI" action for text items
 * - Concise summary shorter than original content
 * - Up to 3 key takeaways
 * - Clear distinction from original content
 * - Actions to regenerate summary and return to original content
 * - Does not replace, modify, or delete original content
 * - Saved summaries persist across app restarts in Room SQLite
 * - For links: explains if webpage content cannot be read from URL alone
 * - Loading indicators and error handling
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ItemDetailScreen(
    itemId: String,
    viewModel: StashViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToEdit: (String) -> Unit
) {
    val activeItems by viewModel.filteredActiveItems.collectAsState()
    val archivedItems by viewModel.filteredArchivedItems.collectAsState()
    val item = activeItems.find { it.id == itemId } ?: archivedItems.find { it.id == itemId }

    val isSummarizing by viewModel.isSummaryLoading.collectAsState()
    val summaryError by viewModel.summaryError.collectAsState()
    val cannotFetchUrlNotice by viewModel.cannotFetchUrlNotice.collectAsState()

    val scrollState = rememberScrollState()

    if (item == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Item not found")
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(item.title, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.togglePin(item) }) {
                        Icon(
                            imageVector = if (item.isPinned) Icons.Default.PushPin else Icons.Outlined.PushPin,
                            contentDescription = if (item.isPinned) "Unpin" else "Pin",
                            tint = if (item.isPinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = { onNavigateToEdit(item.id) }) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Type & Tag header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = item.type.name,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                if (!item.summary.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFF3E8FF),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDDD6FE))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = Color(0xFF7E22CE),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "AI Summary Saved",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF6B21A8),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // Title
            Text(
                text = item.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )

            // AI Quick Summaries Section
            if (!item.summary.isNullOrBlank()) {
                // Display saved summary
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F3FF)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDDD6FE)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.AutoAwesome,
                                    contentDescription = null,
                                    tint = Color(0xFF6D28D9),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "AI Quick Summary",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF4C1D95)
                                )
                            }

                            Row {
                                TextButton(
                                    onClick = { viewModel.requestAiSummary(item) },
                                    enabled = !isSummarizing
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Regenerate", style = MaterialTheme.typography.labelSmall)
                                }
                                IconButton(
                                    onClick = { viewModel.removeSummary(item.id) },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Remove summary", tint = Color.Gray, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        // Summary paragraph
                        Text(
                            text = item.summary,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF1E1B4B),
                            lineHeight = MaterialTheme.typography.bodyMedium.lineHeight
                        )

                        // Key Takeaways
                        if (item.keyTakeaways.isNotEmpty()) {
                            Divider(color = Color(0xFFDDD6FE))
                            Text(
                                text = "Key Takeaways (\${item.keyTakeaways.size})",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4C1D95)
                            )
                            item.keyTakeaways.forEach { takeaway ->
                                Row(verticalAlignment = Alignment.Top) {
                                    Text("•", color = Color(0xFF6D28D9), fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 6.dp))
                                    Text(
                                        text = takeaway,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFF312E81)
                                    )
                                }
                            }
                        }

                        // Attribution
                        Text(
                            text = item.summarySourceNote ?: "Distinguished from original content • Original note preserved below",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF6B7280)
                        )
                    }
                }
            } else {
                // "Summarize with AI" action
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "AI Quick Summary",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Generate a concise summary & up to 3 key takeaways",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Button(
                                onClick = { viewModel.requestAiSummary(item) },
                                enabled = !isSummarizing
                            ) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(if (isSummarizing) "Summarizing..." else "Summarize with AI")
                            }
                        }
                    }
                }
            }

            // Loading indicator
            if (isSummarizing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            // Error notice
            summaryError?.let { err ->
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFD97706))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = err, style = MaterialTheme.typography.bodySmall, color = Color(0xFF92400E), modifier = Modifier.weight(1f))
                        IconButton(onClick = { viewModel.clearSummaryError() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Dismiss", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }

            // Cannot fetch external URL notice
            cannotFetchUrlNotice?.let { notice ->
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE0F2FE)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF0284C7))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = notice, style = MaterialTheme.typography.bodySmall, color = Color(0xFF075985), modifier = Modifier.weight(1f))
                        IconButton(onClick = { viewModel.clearCannotFetchUrlNotice() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Dismiss", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }

            // Original Content Section (Never modified or deleted)
            Divider()
            Text(
                text = "ORIGINAL CONTENT",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            when (item.type) {
                ItemType.NOTE -> {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = item.contentOrUrl,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
                ItemType.LINK -> {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFE0F2FE),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("URL:", style = MaterialTheme.typography.labelSmall, color = Color(0xFF0369A1))
                            Text(item.contentOrUrl, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF0284C7))
                        }
                    }
                }
                ItemType.IMAGE -> {
                    item.imageUri?.let { uri ->
                        AsyncImage(
                            model = uri,
                            contentDescription = item.title,
                            modifier = Modifier.fillMaxWidth().height(240.dp)
                        )
                    }
                }
            }

            // Tags
            if (item.tags.isNotEmpty()) {
                Text(
                    text = "TAGS",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    item.tags.forEach { tag ->
                        SuggestionChip(
                            onClick = {},
                            label = { Text("#$tag") }
                        )
                    }
                }
            }
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/stash/app/MainActivity.kt',
    language: 'kotlin',
    description: 'Main entry point setting up ViewModel, Compose Navigation, and Material 3 theme',
    content: `package com.stash.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.*
import com.stash.app.ui.StashViewModel
import com.stash.app.ui.StashViewModelFactory
import com.stash.app.ui.screens.AddEditScreen
import com.stash.app.ui.screens.ArchivedScreen
import com.stash.app.ui.screens.HomeScreen
import com.stash.app.ui.theme.StashTheme

/**
 * MainActivity: Single-Activity Compose architecture.
 * Initializes the StashViewModel connected to Room SQLite and AiTaggingService.
 */
class MainActivity : ComponentActivity() {

    private val viewModel: StashViewModel by viewModels {
        val app = application as StashApplication
        StashViewModelFactory(app.repository, app.aiTaggingService, app.aiSummaryService)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            StashTheme {
                val navController = rememberNavController()
                val currentBackStack by navController.currentBackStackEntryAsState()
                val currentRoute = currentBackStack?.destination?.route

                Scaffold(
                    bottomBar = {
                        // Only show bottom navigation on main top-level screens
                        if (currentRoute == "home" || currentRoute == "archived") {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = currentRoute == "home",
                                    onClick = { navController.navigate("home") { popUpTo("home") { inclusive = true } } },
                                    icon = { Icon(Icons.Default.Inbox, contentDescription = "Inbox") },
                                    label = { Text("Inbox") }
                                )
                                NavigationBarItem(
                                    selected = currentRoute == "archived",
                                    onClick = { navController.navigate("archived") },
                                    icon = { Icon(Icons.Default.Archive, contentDescription = "Archived") },
                                    label = { Text("Archived") }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = "home",
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable("home") {
                            HomeScreen(
                                viewModel = viewModel,
                                onNavigateToAdd = { navController.navigate("add_edit") },
                                onNavigateToEdit = { id -> navController.navigate("add_edit?id=$id") }
                            )
                        }
                        composable("archived") {
                            ArchivedScreen(
                                viewModel = viewModel,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                        composable("add_edit?id={id}") { backStackEntry ->
                            val id = backStackEntry.arguments?.getString("id")
                            AddEditScreen(
                                itemId = id,
                                viewModel = viewModel,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                        composable("add_edit") {
                            AddEditScreen(
                                itemId = null,
                                viewModel = viewModel,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                    }
                }
            }
        }
    }
}
`
  },
  {
    path: 'README.md',
    language: 'markdown',
    description: 'Step-by-step setup guide for running the Stash Android app in Android Studio',
    content: `# Stash - Personal Save-for-Later Inbox with AI Quick Summaries & Tagging

A clean, modern, native Android application built with **Kotlin**, **Jetpack Compose (Material 3)**, **Room with SQLite** for local, offline-first persistent storage, and **Gemini AI Quick Summaries**.

## Key Features

1. **Persistent Local SQLite Database via Room**: All notes, links, photos, and generated AI summaries persist across app reboots and kills. Zero cloud database dependency.
2. **AI Quick Summaries**:
   - **"Summarize with AI"**: Generates a concise, scannable executive summary and up to 3 key takeaways from the available note or item text.
   - **Original Text Preservation**: AI summaries are clearly distinguished from the original text; the user's original content is never replaced, modified, or deleted.
   - **Regeneration & Offline Storage**: Users can regenerate summaries anytime, remove them, or return to original content. Generated summaries persist in local SQLite.
   - **Transparent Source Rules**: For links, Stash does not pretend to crawl external web pages from a URL alone and prompts the user to provide article text. For images, summaries are generated strictly when reliable visual or descriptive data is present.
3. **AI Smart Tagging with User Control**:
   - Suggests context-aware tags with interactive chips for individual user acceptance or dismissal.
4. **Support for 3 Item Types**:
   - **Notes**: Text thoughts, checklists, quotes.
   - **Links**: Web URLs with built-in validation.
   - **Images**: Pick photos directly from device storage via Android's Photo Picker.
5. **Organize & Retrieve**:
   - Instant search across title, content, and tags.
   - Type filter chips (All, Notes, Links, Images).
   - Tag filter chips.
6. **Archive & Restore**: Keep your inbox clean by archiving items; restore or permanently delete them anytime.
7. **Modern Material 3 Design**: Card elevation, accessible contrast, edge-to-edge layout, and responsive layouts.

## Security Architecture for AI Integration

> **CRITICAL SECURITY RULE**: Secret AI API keys (such as \`GEMINI_API_KEY\`) are **NEVER hardcoded** in client-side Android source code or committed to version control. Android APK binaries can easily be decompiled with tools like JADX or apktool, which would expose embedded keys to attackers.

Stash implements the industry-standard **Secure Backend Proxy pattern**:
1. The Android client calls trusted backend endpoints (\`POST /api/ai/summarize\` and \`POST /api/ai/suggest-tags\`).
2. The server-side proxy securely injects \`GEMINI_API_KEY\` from environment secrets to communicate with the Gemini API.
3. In development on the Android Emulator, the app connects to the development host server via \`http://10.0.2.2:3000\`.
4. If AI is unconfigured or offline, error notices explain what is missing without affecting local storage or existing app features.

## Architecture & Code Structure

\`\`\`
com.stash.app
├── data
│   ├── local
│   │   ├── Converters.kt       # Room TypeConverters for Tags List & ItemType enum
│   │   ├── StashDao.kt         # Room DAO SQLite queries returning Kotlin Flow
│   │   └── StashDatabase.kt    # RoomDatabase singleton file (stash_database.db)
│   ├── model
│   │   └── StashItem.kt        # Room Entity data class (UUID, type, timestamps, summary)
│   ├── remote
│   │   ├── AiSummaryService.kt # Secure proxy client for AI Quick Summaries
│   │   └── AiTaggingService.kt # Secure proxy client for AI Smart Tagging
│   └── repository
│       └── StashRepository.kt  # Clean architecture repository
├── ui
│   ├── components
│   │   └── StashItemCard.kt    # Material 3 card composable with summary badge
│   ├── screens
│   │   ├── HomeScreen.kt       # Inbox screen with search & filter chips
│   │   ├── AddEditScreen.kt    # Form with AI Smart Tagging chips & validation
│   │   ├── ItemDetailScreen.kt # Detail screen with AI Quick Summaries & takeaways
│   │   └── ArchivedScreen.kt   # Archived items screen
│   ├── theme
│   │   ├── Color.kt
│   │   └── Theme.kt
│   └── StashViewModel.kt       # StateFlow, search/filter, SQLite, & AI summary states
├── MainActivity.kt             # Navigation compose host
└── StashApplication.kt         # Application singleton initializing Room & AI services
\`\`\`

## How to Run in Android Studio & Emulator

1. Download the generated project ZIP file from the app.
2. Unzip into a folder on your computer.
3. Open **Android Studio** (Hedgehog, Iguana, Koala, Ladybug, or newer).
4. Select **File > Open** and select the unzipped directory.
5. Allow Gradle to sync.
6. Select any Android Virtual Device (e.g. Pixel 8 with Android 14 / API 34).
7. Ensure the local Stash backend server is running on port 3000 (accessible to the emulator via \`10.0.2.2:3000\`).
8. Click the green **Run (▶)** button!
9. Use **App Inspection > Database Inspector** inside Android Studio to inspect the live SQLite \`stash_database.db\` tables and run direct SQL queries!
`
  }
];

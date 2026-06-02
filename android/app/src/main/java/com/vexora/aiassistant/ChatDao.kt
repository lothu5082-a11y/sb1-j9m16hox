package com.vexora.aiassistant

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface ChatDao {
    @Insert
    suspend fun insert(message: ChatEntity)

    @Query("SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT :count")
    suspend fun getRecent(count: Int): List<ChatEntity>

    @Query("DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY timestamp DESC LIMIT 200)")
    suspend fun pruneOld()
}

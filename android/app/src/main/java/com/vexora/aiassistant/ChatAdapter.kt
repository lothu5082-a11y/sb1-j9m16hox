package com.vexora.aiassistant

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.vexora.aiassistant.databinding.ItemAiMessageBinding
import com.vexora.aiassistant.databinding.ItemUserMessageBinding

class ChatAdapter(private val messages: MutableList<ChatMessage>) :
    RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private inner class AiHolder(val b: ItemAiMessageBinding) : RecyclerView.ViewHolder(b.root)
    private inner class UserHolder(val b: ItemUserMessageBinding) : RecyclerView.ViewHolder(b.root)

    override fun getItemViewType(position: Int) = if (messages[position].isUser) 1 else 0

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inf = LayoutInflater.from(parent.context)
        return if (viewType == 1)
            UserHolder(ItemUserMessageBinding.inflate(inf, parent, false))
        else
            AiHolder(ItemAiMessageBinding.inflate(inf, parent, false))
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val m = messages[position]
        when (holder) {
            is AiHolder   -> { holder.b.tvMessage.text = m.text; holder.b.tvTime.text = m.time }
            is UserHolder -> { holder.b.tvMessage.text = m.text; holder.b.tvTime.text = m.time }
        }
    }

    override fun getItemCount() = messages.size

    fun addMessage(msg: ChatMessage) {
        messages.add(msg)
        notifyItemInserted(messages.size - 1)
    }
}

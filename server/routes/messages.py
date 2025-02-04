from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from server.database import get_connection

router = APIRouter()

# Data model for message
class Message(BaseModel):
    sender: str
    receiver: str
    content: str

class MessageEdit(BaseModel):
    content: str    

# Sending a message
@router.post("/send")
def send_message(message: Message):
    print(f"Message received: {message.dict()}")
    conn = get_connection()
    cursor = conn.cursor()

    # Get the sender and recipient IDs
    cursor.execute("SELECT id FROM users WHERE username = ?", (message.sender,))
    sender_id = cursor.fetchone()
    cursor.execute("SELECT id FROM users WHERE username = ?", (message.receiver,))
    receiver_id = cursor.fetchone()

    if not sender_id or not receiver_id:
        raise HTTPException(status_code=404, detail="Sender or recipient not found")

    # Save the message in the database
        cursor.execute("""
        INSERT INTO messages (sender_id, receiver_id, content)
        VALUES (?, ?, ?)
    """, (sender_id["id"], receiver_id["id"], message.content))

    conn.commit()
    conn.close()
    return {"message": "Message sent"}

@router.get("/list/{username}")
def list_chats(username: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user_id = cursor.fetchone()

    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    cursor.execute("""
        SELECT id, name FROM chats
        WHERE user1_id = ? OR user2_id = ?
    """, (user_id["id"], user_id["id"]))
    chats = cursor.fetchall()
    conn.close()

    return {"chats": [{"id": chat["id"], "name": chat["name"]} for chat in chats]}

@router.get("/history/{chat_id}")
def get_message_history(chat_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    # Get message history with ID
    cursor.execute("""
        SELECT messages.id, messages.content, messages.timestamp, users.username AS sender
        FROM messages
        JOIN users ON messages.sender_id = users.id
        WHERE messages.chat_id = ?
        ORDER BY messages.timestamp ASC
    """, (chat_id,))
    messages = cursor.fetchall()
    conn.close()

    # Returning data
    return {
        "history": [
            {
                "id": msg["id"],  # Add message ID
                "content": msg["content"],
                "timestamp": msg["timestamp"],
                "sender": msg["sender"]
            }
            for msg in messages
        ]
    }

@router.put("/edit/{message_id}")
def edit_message(message_id: int, payload: MessageEdit):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message text is required")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Проверяем, существует ли сообщение
        cursor.execute("SELECT id FROM messages WHERE id = ?", (message_id,))
        message = cursor.fetchone()
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Обновляем сообщение
        cursor.execute("""
            UPDATE messages
            SET content = ?, edited_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (content, message_id))
        conn.commit()
        return {"message": "Message successfully updated"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    finally:
        conn.close()

@router.delete("/delete/{message_id}")
def delete_message(message_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    # Check if the message exists
    cursor.execute("SELECT * FROM messages WHERE id = ?", (message_id,))
    message = cursor.fetchone()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Delete the message
    cursor.execute("DELETE FROM messages WHERE id = ?", (message_id,))
    conn.commit()
    conn.close()

    return {"message": "Message deleted"}

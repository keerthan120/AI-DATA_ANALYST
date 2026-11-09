import uuid
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from app.db.session import Base, engine

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="New Analysis")
    user_id = Column(Integer, nullable=True, index=True)
    active_tables = Column(Text, nullable=True, default="[]")  # JSON list of table names
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship(
        "ChatMessageModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessageModel.created_at"
    )

    def get_tables_list(self) -> list[str]:
        if not self.active_tables:
            return []
        try:
            return json.loads(self.active_tables)
        except Exception:
            return []

    def set_tables_list(self, tables: list[str]) -> None:
        self.active_tables = json.dumps(tables)

class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)
    response_payload = Column(Text, nullable=True)  # JSON-encoded string containing chart, SQL, Python, anomalies, reasoning
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

# Safe automatic migration check
def ensure_db_schema():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            # Check if active_tables column exists in conversations
            conn.execute(text("ALTER TABLE conversations ADD COLUMN active_tables TEXT;"))
            conn.commit()
        except Exception:
            pass  # Column already exists

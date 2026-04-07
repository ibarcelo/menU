from functools import lru_cache
from supabase import create_client, Client
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"
    max_images_per_scan: int = 5
    max_image_size_mb: int = 10

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    # Use service role key – bypasses RLS for backend operations
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

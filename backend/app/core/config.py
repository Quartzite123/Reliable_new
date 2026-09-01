from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Loaded from environment variables / a .env file at the backend/ root.
    See .env.example for the full list of required variables.
    """

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS allowlist — comma-separated origins, no wildcard (2026-09-01
    # security audit fix #5). Previously allow_origins=["*"] +
    # allow_credentials=True, which Starlette's CORSMiddleware resolves by
    # echoing back whatever Origin the request sent (verified live with a
    # forged Origin header) rather than a literal "*" — any site could get
    # a credentialed response. Defaults to the local Vite dev port only;
    # set FRONTEND_ORIGINS in production to the deployed frontend's exact
    # origin(s) (e.g. the Vercel URL), comma-separated if there's more than
    # one (production + preview deployments).
    FRONTEND_ORIGINS: str = "http://localhost:5173"

    @property
    def frontend_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]

    # Cloudinary — file uploads (passbook photos, lab seal photos/documents,
    # weighing slip photos). Required: Render's filesystem is ephemeral, so
    # local disk storage doesn't survive a restart. Never hardcode these.
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

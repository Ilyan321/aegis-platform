import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GitHubUser(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None


class GitHubCommit(BaseModel):
    id: str
    message: Optional[str] = None
    timestamp: Optional[str] = None
    author: Optional[GitHubUser] = None
    committer: Optional[GitHubUser] = None
    added: Optional[List[str]] = Field(default_factory=list)
    removed: Optional[List[str]] = Field(default_factory=list)
    modified: Optional[List[str]] = Field(default_factory=list)


class GitHubRepositoryPayload(BaseModel):
    id: int
    name: str
    full_name: str
    clone_url: str
    default_branch: Optional[str] = "main"


class GitHubPushPayload(BaseModel):
    ref: str  # e.g., "refs/heads/main"
    before: Optional[str] = None
    after: Optional[str] = None
    repository: GitHubRepositoryPayload
    pusher: Optional[Dict[str, Any]] = None
    sender: Optional[Dict[str, Any]] = None
    head_commit: Optional[GitHubCommit] = None
    commits: Optional[List[GitHubCommit]] = Field(default_factory=list)


class WebhookIngestResponse(BaseModel):
    status: str = "accepted"
    message: str
    delivery_id: str
    scan_run_id: Optional[uuid.UUID] = None
    repository: str
    branch: str
    commit_sha: str

"""
SkyResQ Database Subsystem
High-performance, persistent SQLite database engine with WAL mode,
thread-safe connection pooling, automated schema migrations,
and comprehensive telemetry/detection repository methods.
"""

import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.core.config import settings

DB_PATH = settings.DB_PATH
_db_lock = threading.Lock()


def get_connection() -> sqlite3.Connection:
    """
    Creates and configures a thread-safe connection to the SQLite database.
    Enables Write-Ahead Logging (WAL) for high concurrency and Row factory.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def get_db():
    """
    Context manager yielding a transactional SQLite connection.
    Automatically commits on success or rolls back on error.
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


_db_initialized = False


def ensure_db_initialized() -> None:
    """Ensures database schema exists before executing queries."""
    global _db_initialized
    if not _db_initialized:
        init_db()


def init_db() -> None:
    """
    Initializes database tables, creates necessary directories,
    and applies schema migrations.
    """
    global _db_initialized
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)

    with _db_lock, get_db() as conn:
        cursor = conn.cursor()

        # 1. Detections Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                detection_id TEXT NOT NULL UNIQUE,
                image_id TEXT,
                timestamp TEXT NOT NULL,
                class_name TEXT NOT NULL,
                confidence REAL NOT NULL,
                bbox_x1 REAL NOT NULL,
                bbox_y1 REAL NOT NULL,
                bbox_x2 REAL NOT NULL,
                bbox_y2 REAL NOT NULL,
                image_url TEXT,
                annotated_image_url TEXT,
                latitude REAL,
                longitude REAL,
                is_real_gps INTEGER DEFAULT 0,
                source_type TEXT DEFAULT 'simulation',
                model_used TEXT DEFAULT 'yolov8n.pt',
                victim_status TEXT DEFAULT 'STABLE',
                notes TEXT,
                created_at TEXT NOT NULL
            );
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_det_timestamp ON detections (timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_det_class ON detections (class_name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_det_image_id ON detections (image_id);")

        # 2. Missions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                status TEXT DEFAULT 'ACTIVE',
                sector TEXT DEFAULT 'Sector 7B',
                start_time TEXT NOT NULL,
                end_time TEXT,
                total_detections INTEGER DEFAULT 0,
                total_victims INTEGER DEFAULT 0,
                total_hazards INTEGER DEFAULT 0,
                notes TEXT
            );
        """)

        # Insert default SAR mission if none exists
        cursor.execute("SELECT COUNT(*) as count FROM missions;")
        if cursor.fetchone()["count"] == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO missions (mission_id, name, status, sector, start_time, notes)
                VALUES ('MISSION-SAR-01', 'Operation Red Shield: High-Priority Grid Sweep', 'ACTIVE', 'Sector 7B', ?, 'Autonomous Drone & Ground Mobile Sensor Ingestion');
            """, (now_iso,))

        # 3. Telemetry Logs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                drone_id TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                altitude REAL NOT NULL,
                speed REAL NOT NULL,
                heading REAL NOT NULL,
                battery REAL NOT NULL,
                flight_mode TEXT NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_telem_timestamp ON telemetry_logs (timestamp);")

        # 4. Camera Nodes & Remote Mobile Sensors Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS camera_nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL UNIQUE,
                device_name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                ip_address TEXT,
                status TEXT DEFAULT 'ONLINE',
                last_seen TEXT NOT NULL,
                frames_streamed INTEGER DEFAULT 0
            );
        """)

        # 5. Operators & Registered Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                email TEXT NOT NULL UNIQUE,
                mobile TEXT,
                callsign TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'TACTICAL UAV PILOT',
                password TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_mobile ON users (mobile);")

        # Schema migration: add username column if it doesn't exist (run BEFORE creating index)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN username TEXT;")
        except Exception:
            pass  # Column already exists

        # Schema migration: relax mobile column constraint if previously NOT NULL or UNIQUE
        try:
            cursor.execute("PRAGMA table_info(users);")
            cols = cursor.fetchall()
            mobile_col = next((c for c in cols if c["name"] == "mobile"), None)
            if mobile_col and mobile_col["notnull"] == 1:
                cursor.execute("PRAGMA foreign_keys = OFF;")
                cursor.execute("""
                    CREATE TABLE users_migration (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT,
                        email TEXT NOT NULL UNIQUE,
                        mobile TEXT,
                        callsign TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'TACTICAL UAV PILOT',
                        password TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                """)
                cursor.execute("""
                    INSERT INTO users_migration (id, username, email, mobile, callsign, role, password, created_at, updated_at)
                    SELECT id, username, email, mobile, callsign, role, password, created_at, updated_at FROM users;
                """)
                cursor.execute("DROP TABLE users;")
                cursor.execute("ALTER TABLE users_migration RENAME TO users;")
                cursor.execute("PRAGMA foreign_keys = ON;")
        except Exception:
            pass

        # Now safe to create index on username column
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_mobile ON users (mobile);")
        except Exception:
            pass

        # Seed master operator accounts if not present
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE email = 'pilot@skyresq.org';")
        if cursor.fetchone()["count"] == 0:
            cursor.execute("""
                INSERT INTO users (email, mobile, callsign, role, password, created_at, updated_at)
                VALUES ('pilot@skyresq.org', '+91 9876543210', 'PILOT-ALPHA', 'TACTICAL UAV PILOT', 'skyresq', ?, ?);
            """, (now_iso, now_iso))

        cursor.execute("SELECT COUNT(*) as count FROM users WHERE email = 'h.fahad2301@gmail.com';")
        if cursor.fetchone()["count"] == 0:
            cursor.execute("""
                INSERT INTO users (email, mobile, callsign, role, password, created_at, updated_at)
                VALUES ('h.fahad2301@gmail.com', '+91 63834002844', 'FAHAD-CMD', 'MISSION COMMAND LEAD', 'skyresq', ?, ?);
            """, (now_iso, now_iso))

        # 6. Active Real-Time OTPs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otps (
                identifier TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                target_type TEXT NOT NULL,
                expires_at REAL NOT NULL,
                attempts INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
        """)

    _db_initialized = True



# ==============================================================================
# REPOSITORY CRUD HELPERS
# ==============================================================================

def save_detection(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inserts a newly identified YOLO detection record into the database.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    det_id = data.get("detection_id") or f"DET-{int(datetime.now().timestamp() * 1000)}"

    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO detections (
                detection_id, image_id, timestamp, class_name, confidence,
                bbox_x1, bbox_y1, bbox_x2, bbox_y2,
                image_url, annotated_image_url,
                latitude, longitude, is_real_gps,
                source_type, model_used, victim_status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            det_id,
            data.get("image_id"),
            data.get("timestamp") or now_iso,
            data.get("class_name", "unknown"),
            float(data.get("confidence", 0.0)),
            float(data.get("bbox_x1", 0.0)),
            float(data.get("bbox_y1", 0.0)),
            float(data.get("bbox_x2", 0.0)),
            float(data.get("bbox_y2", 0.0)),
            data.get("image_url"),
            data.get("annotated_image_url"),
            data.get("latitude"),
            data.get("longitude"),
            1 if data.get("is_real_gps") else 0,
            data.get("source_type", "simulation"),
            data.get("model_used", "yolov8n.pt"),
            data.get("victim_status", "STABLE"),
            data.get("notes"),
            now_iso
        ))

    return {**data, "detection_id": det_id, "created_at": now_iso}


def get_recent_detections(limit: int = 50, class_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieves the most recent recorded detections from the database.
    """
    query = "SELECT * FROM detections"
    params = []

    if class_name:
        query += " WHERE LOWER(class_name) = LOWER(?)"
        params.append(class_name)

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_detection_counts() -> Dict[str, Any]:
    """
    Returns aggregated detection counts and latest timestamp.
    """
    ensure_db_initialized()
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total FROM detections;")
            total = cursor.fetchone()["total"]

            cursor.execute("""
                SELECT COUNT(*) as persons FROM detections
                WHERE LOWER(class_name) IN ('person', 'casualty', 'survivor', 'human');
            """)
            persons = cursor.fetchone()["persons"]

            cursor.execute("""
                SELECT COUNT(*) as hazards FROM detections
                WHERE LOWER(class_name) IN ('hazard', 'fire', 'smoke', 'debris', 'flood', 'vehicle', 'car', 'truck');
            """)
            hazards = cursor.fetchone()["hazards"]

            cursor.execute("SELECT timestamp FROM detections ORDER BY id DESC LIMIT 1;")
            latest_row = cursor.fetchone()
            latest_time = latest_row["timestamp"] if latest_row else None

            return {
                "total_detections": total,
                "total_persons": persons,
                "total_hazards": hazards,
                "last_detection_time": latest_time
            }
    except Exception:
        return {
            "total_detections": 0,
            "total_persons": 0,
            "total_hazards": 0,
            "last_detection_time": None
        }


def delete_detection_by_image_id(image_id: str) -> bool:
    """
    Deletes all detection records associated with an image ID.
    """
    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM detections WHERE image_id = ?;", (image_id,))
        return cursor.rowcount > 0


def clear_detections_table() -> int:
    """
    Wipes all detections from the database.
    """
    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM detections;")
        deleted = cursor.rowcount
        return deleted


def log_telemetry(data: Dict[str, Any]) -> None:
    """
    Appends an avionics telemetry point to the telemetry_logs table.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO telemetry_logs (
                timestamp, drone_id, latitude, longitude, altitude,
                speed, heading, battery, flight_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            data.get("timestamp") or now_iso,
            data.get("drone_id", "SkyResQ-DRONE-01"),
            float(data.get("latitude", 0.0)),
            float(data.get("longitude", 0.0)),
            float(data.get("altitude", 0.0)),
            float(data.get("speed", 0.0)),
            float(data.get("heading", 0.0)),
            float(data.get("battery", 0.0)),
            data.get("flight_mode", "STANDBY")
        ))


def register_camera_node(
    device_id: str,
    device_name: str,
    device_type: str,
    ip_address: Optional[str] = None
) -> Dict[str, Any]:
    """
    Registers or updates a connected mobile camera or laptop sensor node.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO camera_nodes (device_id, device_name, device_type, ip_address, status, last_seen, frames_streamed)
            VALUES (?, ?, ?, ?, 'ONLINE', ?, 1)
            ON CONFLICT(device_id) DO UPDATE SET
                device_name = excluded.device_name,
                ip_address = excluded.ip_address,
                status = 'ONLINE',
                last_seen = excluded.last_seen,
                frames_streamed = camera_nodes.frames_streamed + 1;
        """, (device_id, device_name, device_type, ip_address, now_iso))

    return {
        "device_id": device_id,
        "device_name": device_name,
        "device_type": device_type,
        "status": "ONLINE",
        "last_seen": now_iso
    }


def get_camera_nodes() -> List[Dict[str, Any]]:
    """
    Lists all registered camera devices and mobile companion nodes.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM camera_nodes ORDER BY last_seen DESC;")
        return [dict(row) for row in cursor.fetchall()]


def get_db_stats() -> Dict[str, Any]:
    """
    Returns high-level statistics about database tables and disk storage.
    """
    size_bytes = 0
    if DB_PATH.exists():
        size_bytes = DB_PATH.stat().st_size

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM detections;")
        det_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM missions;")
        mission_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM telemetry_logs;")
        telem_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM camera_nodes;")
        camera_nodes_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM users;")
        users_count = cursor.fetchone()["count"]

        return {
            "status": "ONLINE",
            "database_file": str(DB_PATH),
            "size_bytes": size_bytes,
            "size_kb": round(size_bytes / 1024, 2),
            "tables": {
                "detections": det_count,
                "missions": mission_count,
                "telemetry_logs": telem_count,
                "camera_nodes": camera_nodes_count,
                "users": users_count
            }
        }


def export_db_json() -> Dict[str, Any]:
    """
    Exports all persisted detections, missions, camera nodes, and operators as a single JSON structure.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM detections ORDER BY id ASC;")
        detections = [dict(row) for row in cursor.fetchall()]

        cursor.execute("SELECT * FROM missions ORDER BY id ASC;")
        missions = [dict(row) for row in cursor.fetchall()]

        cursor.execute("SELECT * FROM camera_nodes ORDER BY id ASC;")
        camera_nodes = [dict(row) for row in cursor.fetchall()]

        cursor.execute("SELECT id, email, mobile, callsign, role, created_at, updated_at FROM users ORDER BY id ASC;")
        users = [dict(row) for row in cursor.fetchall()]

        return {
            "project": "SkyResQ Aerial Search & Rescue",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "database_file": str(DB_PATH),
            "detections": detections,
            "missions": missions,
            "camera_nodes": camera_nodes,
            "users": users
        }


# ==============================================================================
# OPERATOR & OTP AUTH REPOSITORY
# ==============================================================================

def get_user(identifier: str) -> Optional[Dict[str, Any]]:
    """
    Finds an operator by email, mobile number, username, or callsign.
    Supports: email@domain.com, +91 9876543210, pilot_rahul, PILOT-ALPHA
    """
    clean_id = identifier.strip().lower()
    clean_mobile = identifier.strip()
    clean_callsign = identifier.strip().upper()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE LOWER(email) = ? OR (mobile IS NOT NULL AND mobile != '' AND mobile = ?) OR LOWER(username) = ? OR UPPER(callsign) = ? LIMIT 1;",
            (clean_id, clean_mobile, clean_id, clean_callsign)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def create_user(email: str, mobile: Optional[str] = None, callsign: str = "", role: str = "TACTICAL UAV PILOT", password: str = "", username: Optional[str] = None) -> Dict[str, Any]:
    """
    Registers a new operator into the persistent SQLite database, or updates existing record
    if the email is already registered, preventing crashes from UNIQUE constraint collisions.
    Mobile number is completely optional.
    """
    clean_email = email.strip().lower()
    clean_mobile = mobile.strip() if mobile else None
    clean_callsign = callsign.strip().upper()
    clean_role = role.strip()
    clean_pw = password.strip()
    clean_username = (username or '').strip().lower() or None
    now_iso = datetime.now(timezone.utc).isoformat()
    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1;", (clean_email,))
            email_row = cursor.fetchone()

            mobile_row = None
            if clean_mobile:
                cursor.execute("SELECT id FROM users WHERE mobile = ? LIMIT 1;", (clean_mobile,))
                mobile_row = cursor.fetchone()

            if email_row:
                user_id = email_row["id"]
                # If a different row has this mobile number, avoid unique collision
                if clean_mobile and mobile_row and mobile_row["id"] != user_id:
                    cursor.execute("UPDATE users SET mobile = ? WHERE id = ?;", (f"{clean_mobile}_{user_id}", mobile_row["id"]))
                cursor.execute("""
                    UPDATE users
                    SET mobile = ?, callsign = ?, role = ?, password = ?, username = ?, updated_at = ?
                    WHERE id = ?;
                """, (clean_mobile, clean_callsign, clean_role, clean_pw, clean_username, now_iso, user_id))
                return {
                    "id": user_id,
                    "email": clean_email,
                    "mobile": clean_mobile or "",
                    "callsign": clean_callsign,
                    "username": clean_username,
                    "role": clean_role,
                    "created_at": now_iso,
                    "updated": True
                }
            elif mobile_row:
                user_id = mobile_row["id"]
                cursor.execute("""
                    UPDATE users
                    SET email = ?, callsign = ?, role = ?, password = ?, username = ?, updated_at = ?
                    WHERE id = ?;
                """, (clean_email, clean_callsign, clean_role, clean_pw, clean_username, now_iso, user_id))
                return {
                    "id": user_id,
                    "email": clean_email,
                    "mobile": clean_mobile or "",
                    "callsign": clean_callsign,
                    "username": clean_username,
                    "role": clean_role,
                    "created_at": now_iso,
                    "updated": True
                }
            else:
                cursor.execute("""
                    INSERT INTO users (username, email, mobile, callsign, role, password, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (clean_username, clean_email, clean_mobile, clean_callsign, clean_role, clean_pw, now_iso, now_iso))
                user_id = cursor.lastrowid
                return {
                    "id": user_id,
                    "email": clean_email,
                    "mobile": clean_mobile or "",
                    "callsign": clean_callsign,
                    "username": clean_username,
                    "role": clean_role,
                    "created_at": now_iso
                }
        except sqlite3.IntegrityError:
            # Fallback update to guarantee success
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1;", (clean_email,))
            row = cursor.fetchone()
            if row:
                user_id = row["id"]
                cursor.execute("UPDATE users SET password = ?, username = ?, updated_at = ? WHERE id = ?;", (clean_pw, clean_username, now_iso, user_id))
                return {
                    "id": user_id,
                    "email": clean_email,
                    "mobile": clean_mobile or "",
                    "callsign": clean_callsign,
                    "username": clean_username,
                    "role": clean_role,
                    "created_at": now_iso,
                    "updated": True
                }
            raise


def update_user_password(identifier: str, new_password: str) -> bool:
    """
    Updates the password for a registered operator identified by email or mobile.
    """
    clean_id = identifier.strip().lower()
    clean_mobile = identifier.strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users
            SET password = ?, updated_at = ?
            WHERE LOWER(email) = ? OR mobile = ?;
        """, (new_password.strip(), now_iso, clean_id, clean_mobile))
        return cursor.rowcount > 0


def list_users() -> List[Dict[str, Any]]:
    """
    Returns list of registered operator accounts with sensitive password excluded.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, mobile, callsign, role, created_at, updated_at FROM users ORDER BY id ASC;")
        return [dict(row) for row in cursor.fetchall()]


def save_otp(identifier: str, code: str, target_type: str = "email", ttl_seconds: int = 300) -> Dict[str, Any]:
    """
    Saves or replaces an active OTP for the specified operator identifier.
    """
    clean_id = identifier.strip().lower()
    now_ts = datetime.now().timestamp()
    expires_at = now_ts + ttl_seconds
    now_iso = datetime.now(timezone.utc).isoformat()

    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO otps (identifier, code, target_type, expires_at, attempts, created_at)
            VALUES (?, ?, ?, ?, 0, ?);
        """, (clean_id, code.strip(), target_type, expires_at, now_iso))

    return {
        "identifier": clean_id,
        "code": code.strip(),
        "target_type": target_type,
        "expires_at": expires_at,
        "ttl_seconds": ttl_seconds
    }


def verify_otp_record(identifier: str, code: str) -> Dict[str, Any]:
    """
    Validates an OTP code for an identifier.
    Returns: {"valid": bool, "reason": str}
    """
    clean_id = identifier.strip().lower()
    now_ts = datetime.now().timestamp()

    with _db_lock, get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM otps WHERE identifier = ? LIMIT 1;", (clean_id,))
        row = cursor.fetchone()

        if not row:
            return {"valid": False, "reason": "No active OTP found. Please request a new verification code."}

        record = dict(row)
        if now_ts > record["expires_at"]:
            cursor.execute("DELETE FROM otps WHERE identifier = ?;", (clean_id,))
            return {"valid": False, "reason": "Verification code has expired (validity is 5 minutes). Request a new code."}

        if record["code"] != code.strip():
            cursor.execute("UPDATE otps SET attempts = attempts + 1 WHERE identifier = ?;", (clean_id,))
            return {"valid": False, "reason": "Invalid verification code. Please check and try again."}

        # Success - clean up OTP
        cursor.execute("DELETE FROM otps WHERE identifier = ?;", (clean_id,))
        return {"valid": True, "reason": "Verification code confirmed."}


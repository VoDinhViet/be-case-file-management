INSERT INTO roles (name, priority)
VALUES ('EMPLOYEE', 1),
       ('ADMIN', 2) ON CONFLICT (name) DO
UPDATE
    SET priority = EXCLUDED.priority;



INSERT INTO referrals (code, created_at)
VALUES (substr(md5(random()::text), 1, 8), now());
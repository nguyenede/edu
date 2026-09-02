ALTER TABLE "Profile"
ADD COLUMN "gender" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "birthday" TEXT,
ADD COLUMN "language" TEXT NOT NULL DEFAULT 'Tiếng Việt (Việt Nam)',
ADD COLUMN "homeAddress" TEXT,
ADD COLUMN "workAddress" TEXT;

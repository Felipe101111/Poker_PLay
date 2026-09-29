ALTER TABLE "table_participants" DROP CONSTRAINT "table_participants_roomMemberId_fkey";
ALTER TABLE "table_participants" ALTER COLUMN "roomMemberId" DROP NOT NULL;
ALTER TABLE "table_participants" ADD CONSTRAINT "table_participants_roomMemberId_fkey" FOREIGN KEY ("roomMemberId") REFERENCES "room_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
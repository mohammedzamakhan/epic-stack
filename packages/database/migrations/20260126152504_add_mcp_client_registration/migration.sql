-- CreateTable
CREATE TABLE "MCPClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "redirectUris" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MCPClient_clientId_key" ON "MCPClient"("clientId");

-- CreateIndex
CREATE INDEX "MCPClient_clientId_idx" ON "MCPClient"("clientId");

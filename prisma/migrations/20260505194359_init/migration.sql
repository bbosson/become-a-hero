-- CreateTable
CREATE TABLE `Book` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'fr',
    `status` VARCHAR(191) NOT NULL DEFAULT 'processing',
    `totalNodes` INTEGER NOT NULL DEFAULT 0,
    `introRaw` TEXT NULL,
    `pdfPath` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Node` (
    `id` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `summary` TEXT NULL,
    `contentRaw` TEXT NOT NULL,
    `choices` JSON NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `audioUrl` VARCHAR(191) NULL,
    `isTerminal` BOOLEAN NOT NULL DEFAULT false,
    `endType` VARCHAR(191) NULL,

    INDEX `Node_bookId_number_idx`(`bookId`, `number`),
    UNIQUE INDEX `Node_bookId_number_key`(`bookId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProcessingJob` (
    `id` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `currentStep` VARCHAR(191) NULL,
    `errorMsg` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProcessingJob_bookId_key`(`bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Savegame` (
    `id` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `currentNodeNumber` INTEGER NOT NULL,
    `resumeNodeNumber` INTEGER NULL,
    `visitedNodes` JSON NOT NULL,
    `nodeOrder` JSON NOT NULL,
    `choicesTaken` JSON NOT NULL,
    `checkpoints` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Savegame_bookId_key`(`bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `providerText` VARCHAR(191) NOT NULL DEFAULT 'gemini',
    `providerImage` VARCHAR(191) NOT NULL DEFAULT 'gemini',
    `providerAudio` VARCHAR(191) NOT NULL DEFAULT 'openai_tts',
    `imagesEnabled` BOOLEAN NOT NULL DEFAULT false,
    `audioEnabled` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Node` ADD CONSTRAINT `Node_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessingJob` ADD CONSTRAINT `ProcessingJob_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Savegame` ADD CONSTRAINT `Savegame_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

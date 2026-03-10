import {Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany} from "typeorm";
import {UserAvatar} from "./UserAvatar";
import {UserSession} from "./UserSessions";
import {ZariumServer} from "../../ZariumServer";
import argon2 from "argon2";
import {parseTime} from "../../utils";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column()
    displayName!: string;

    @Column({ default: false })
    superadmin!: boolean;

    @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
    createdAt!: Date;

    @Column({ default: "" })
    perms!: string;

    @Column()
    passwordHash!: string;

    @Column({ nullable: true })
    vaultSalt?: string;

    @Column({ nullable: true })
    encryptedVaultKey?: string;

    @Column({ nullable: true })
    vaultIv?: string;

    @Column({ nullable: true })
    vaultTag?: string;

    @Column({ default: false })
    setup!: boolean;

    @OneToOne(() => UserAvatar, avatar => avatar.user, { cascade: true })
    avatar?: UserAvatar;

    @OneToMany(() => UserSession, session => session.user)
    sessions!: UserSession[];

    static async createAccount(
        username: string,
        password: string,
        displayName: string,
        perms: string = "",
        setup = true
    ) {
        const repo = ZariumServer.getInstance().database.dataSource.getRepository(User);

        const passwordHash = await argon2.hash(password);

        const vaultSalt = crypto.randomBytes(16);

        const passwordKey = await argon2.hash(password, {
            salt: vaultSalt,
            raw: true,
            hashLength: 32,
            type: argon2.argon2id
        });

        const vaultKey = crypto.randomBytes(32);

        const iv = crypto.randomBytes(12);

        const cipher = crypto.createCipheriv("aes-256-gcm", passwordKey, iv);

        const encryptedVaultKey = Buffer.concat([
            cipher.update(vaultKey),
            cipher.final()
        ]);

        const tag = cipher.getAuthTag();

        const user = repo.create({
            username,
            displayName,
            perms,
            passwordHash,

            vaultSalt: vaultSalt.toString("base64"),
            encryptedVaultKey: encryptedVaultKey.toString("base64"),
            vaultIv: iv.toString("base64"),
            vaultTag: tag.toString("base64"),
            setup: setup
        });

        await repo.save(user);

        return user;
    }

    async updatePerms(bitfield: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        await userRepo.update(this.id, {perms: bitfield});
    }

    async updatePassword(oldPassword: string, newPassword: string) {
        if (!(await argon2.verify(this.passwordHash, oldPassword)))
            throw new Error("Invalid password");

        const salt = Buffer.from(this.vaultSalt!, "base64");

        const oldKey = await argon2.hash(oldPassword, {
            salt,
            raw: true,
            hashLength: 32,
            type: argon2.argon2id
        });

        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            oldKey,
            Buffer.from(this.vaultIv!, "base64")
        );

        decipher.setAuthTag(Buffer.from(this.vaultTag!, "base64"));

        const vaultKey = Buffer.concat([
            decipher.update(Buffer.from(this.encryptedVaultKey!, "base64")),
            decipher.final()
        ]);

        const newSalt = crypto.randomBytes(16);

        const newKey = await argon2.hash(newPassword, {
            salt: newSalt,
            raw: true,
            hashLength: 32,
            type: argon2.argon2id
        });

        const iv = crypto.randomBytes(12);

        const cipher = crypto.createCipheriv("aes-256-gcm", newKey, iv);

        const encryptedVaultKey = Buffer.concat([
            cipher.update(vaultKey),
            cipher.final()
        ]);

        const tag = cipher.getAuthTag();

        const repo = ZariumServer.getInstance().database.dataSource.getRepository(User);

        await repo.update(this.id, {
            passwordHash: await argon2.hash(newPassword),
            vaultSalt: newSalt.toString("base64"),
            encryptedVaultKey: encryptedVaultKey.toString("base64"),
            vaultIv: iv.toString("base64"),
            vaultTag: tag.toString("base64")
        });
    }

    static async getUserById(id: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        return userRepo.findOne({ where: { id } });
    }

    static async getUserByUsername(username: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        return userRepo.findOne({ where: { username } });
    }

    async checkPassword(password: string) {
        return argon2.verify(this.passwordHash, password);
    }

    async createSession(userAgent?: string) {
        const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);

        const refreshToken = crypto.randomBytes(32).toString("hex");
        const refreshTokenHash = await argon2.hash(refreshToken);

        const session = userSessionRepo.create({
            userId: this.id,
            refreshTokenHash: refreshTokenHash,
            refreshTokenKey: uuidv4(),
            expiresAt: new Date(Date.now() + parseTime(ZariumServer.getInstance().REFRESH_TOKEN_EXPIRATION_TIME)),
            userAgent: userAgent,
        });

        await userSessionRepo.save(session);

        return {
            id: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            refreshToken: refreshToken,
            refreshKey: session.refreshTokenKey,
        };
    }
}
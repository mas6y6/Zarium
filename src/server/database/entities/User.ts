import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    OneToMany
} from "typeorm";

import { Encryption } from "../../Encryption";
import { v4 as uuidv4 } from "uuid";

import { ZariumServer } from "../../ZariumServer";
import { parseTime } from "../../utils";

import { UserAvatar } from "./UserAvatar";
import { UserSession } from "./UserSessions";
import { UserVault } from "./UserVault";

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

    @Column({ default: false })
    setup!: boolean;

    @OneToOne(() => UserAvatar, avatar => avatar.user, { cascade: true })
    avatar?: UserAvatar;

    @OneToOne(() => UserVault, vault => vault.user, { cascade: true, eager: true })
    vault!: UserVault;

    @OneToMany(() => UserSession, session => session.user)
    sessions!: UserSession;

    /* ----------------------------- Utilities ----------------------------- */

    /* --------------------------- Account Create -------------------------- */

    static async createAccount(
        username: string,
        password: string,
        displayName: string,
        perms = "",
        setup = true
    ) {
        const repo = ZariumServer.getInstance().database.dataSource.getRepository(User);

        const passwordHash = await Encryption.hashPassword(password);

        const vaultSalt = Encryption.randomBytes(16);

        const passwordKey = await Encryption.deriveKey(password, vaultSalt);

        const vaultKey = Encryption.randomBytes(32);

        const wrapped = Encryption.encrypt(vaultKey, passwordKey);

        const user = repo.create({
            id: uuidv4(),
            username,
            displayName,
            perms,
            passwordHash,
            vaultSalt: vaultSalt.toString("base64"),
            setup
        });

        const vaultRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserVault);
        const vault = vaultRepo.create({
            id: user.id,
            encryptedVaultKey: wrapped.encrypted.toString("base64"),
            vaultKeyIv: wrapped.iv.toString("base64"),
            vaultKeyTag: wrapped.tag.toString("base64"),
            vault: "" // empty vault for new user
        });

        user.vault = vault;

        await repo.save(user);

        return user;
    }

    /* ---------------------------- Password Ops --------------------------- */

    async updatePassword(oldPassword: string, newPassword: string) {

        if (!(await Encryption.verifyPassword(this.passwordHash, oldPassword))) {
            throw new Error("Invalid password");
        }

        const salt = Buffer.from(this.vaultSalt!, "base64");

        const oldPasswordKey = await Encryption.deriveKey(oldPassword, salt);

        const vaultKey = Encryption.decrypt(
            Buffer.from(this.vault!.encryptedVaultKey!, "base64"),
            oldPasswordKey,
            Buffer.from(this.vault!.vaultKeyIv!, "base64"),
            Buffer.from(this.vault!.vaultKeyTag!, "base64")
        );

        const newSalt = Encryption.randomBytes(16);

        const newPasswordKey = await Encryption.deriveKey(newPassword, newSalt);

        const wrapped = Encryption.encrypt(vaultKey, newPasswordKey);

        const repo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        const vaultRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserVault);

        this.passwordHash = await Encryption.hashPassword(newPassword);
        this.vaultSalt = newSalt.toString("base64");

        await repo.save(this);

        this.vault!.encryptedVaultKey = wrapped.encrypted.toString("base64");
        this.vault!.vaultKeyIv = wrapped.iv.toString("base64");
        this.vault!.vaultKeyTag = wrapped.tag.toString("base64");

        await vaultRepo.save(this.vault!);
    }

    /* --------------------------- User Lookups --------------------------- */

    static async getUserById(id: string) {
        const repo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        return repo.findOne({ where: { id } });
    }

    static async getUserByUsername(username: string) {
        const repo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        return repo.findOne({ where: { username } });
    }

    async checkPassword(password: string) {
        return Encryption.verifyPassword(this.passwordHash, password);
    }

    /* ----------------------------- Sessions ----------------------------- */

    async createSession(userAgent?: string) {

        const repo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);

        const refreshToken = Encryption.randomBytes(32).toString("hex");
        const refreshTokenHash = await Encryption.hashPassword(refreshToken);

        const session = repo.create({
            userId: this.id,
            refreshTokenHash,
            refreshTokenKey: uuidv4(),
            expiresAt: new Date(
                Date.now() +
                parseTime(ZariumServer.getInstance().REFRESH_TOKEN_EXPIRATION_TIME)
            ),
            userAgent
        });

        await repo.save(session);

        return {
            id: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            refreshToken,
            refreshKey: session.refreshTokenKey
        };
    }

    /* ----------------------------- Perms ----------------------------- */

    async updatePerms(bitfield: string) {
        const repo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        this.perms = bitfield;
        await repo.save(this);
    }

}
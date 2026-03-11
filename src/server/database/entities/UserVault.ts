import {Entity, Column, PrimaryColumn, JoinColumn, OneToOne} from "typeorm";
import {User} from "./User";

@Entity("user_vault")
export class UserVault {
    @PrimaryColumn("uuid")
    id!: string;

    @Column({ default: "" })
    vault!: string;

    @Column({ nullable: true })
    iv!: string;

    @Column({ nullable: true })
    tag!: string;

    @Column({ nullable: true })
    encryptedVaultKey?: string;

    @Column({ nullable: true })
    vaultKeyIv?: string;

    @Column({ nullable: true })
    vaultKeyTag?: string;

    @OneToOne(() => User, user => user.vault)
    @JoinColumn({ name: "id" }) // link by same UUID
    user!: User;
}

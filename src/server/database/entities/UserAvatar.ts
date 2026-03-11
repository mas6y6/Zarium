import {Entity, Column, PrimaryColumn, JoinColumn, OneToOne} from "typeorm";
import {User} from "./User";

@Entity("user_avatars")
export class UserAvatar {
    @PrimaryColumn("uuid")
    id!: string;

    @Column()
    mimetype!: string;

    @OneToOne(() => User, user => user.avatar)
    @JoinColumn({ name: "id" })
    user!: User;
}

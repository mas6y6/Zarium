import {ZariumServer} from "../ZariumServer";
import {parseTime, requireJson, SafeRequest, safeRoute} from "../utils";
import {User} from "../database/entities/User";
import {UserAvatar} from "../database/entities/UserAvatar";
import {UserSession} from "../database/entities/UserSessions";
import {UserJwtPayload} from "../utils";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";

const server:ZariumServer = ZariumServer.getInstance();

safeRoute(server.app, '/api/auth/verify', 'post', async (req: SafeRequest,res) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.cookies?.["access-token"]) {
        token = req.cookies["access-token"];
    }

    if (!token) return res.status(401).json({ detail: "Missing token" });

    let payload: UserJwtPayload | null = null;
    try {
        payload = jwt.verify(token, ZariumServer.getInstance().ACCESS_TOKEN_SECRET) as UserJwtPayload;
    } catch {
        return res.status(401).json({ detail: "Invalid token" })
    }

    const user = await User.getUserById(payload.userId);
    if (!user) return res.status(401).json({ detail: "User not found" });

    return res.send({
        id: payload?.userId,
        superadmin: user.superadmin
    })
});

safeRoute(server.app, '/api/auth/password_auth', 'post', async (req: SafeRequest,res) => {
    if (!requireJson(req,res)) return;

    const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
    const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
    const user = await userRepo.findOne({where: {username: req.body.username}});
    if (!user) return res.status(401).json({ detail: "Invalid credentials" });

    if (!(await user.checkPassword(req.body.password))) return res.status(401).json({ detail: "Invalid credentials" });
    const session = await user.createSession(req.headers["user-agent"]);
    const access_token = await (await userSessionRepo.findOne({
        where: {
            id: session.id
        }
    }))?.createAccessToken()

    res.cookie('access-token', access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: parseTime(ZariumServer.getInstance().ACCESS_TOKEN_EXPIRATION_TIME)
    });

    res.cookie('refresh-token-key', session.refreshKey, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: parseTime(ZariumServer.getInstance().REFRESH_TOKEN_EXPIRATION_TIME)
    });

    res.cookie('refresh-token-val', session.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: parseTime(ZariumServer.getInstance().REFRESH_TOKEN_EXPIRATION_TIME)
    });

    res.send({
        user_id: user.id
    });
})

safeRoute(server.app, '/api/auth/refresh', 'post', async (req: SafeRequest,res) => {
    const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
    const refreshTokenKey = req.cookies?.["refresh-token-key"];
    const refreshTokenVal = req.cookies?.["refresh-token-val"];

    if (!refreshTokenKey || !refreshTokenVal) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

    const session = await userSessionRepo.findOne({
        where: {
            refreshTokenKey: refreshTokenKey,
        }
    });

    if (!session) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

    if (!session.isValid()) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

    if (!await session.checkSession(refreshTokenVal)) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

    const access_token = await (await userSessionRepo.findOne({
        where: {
            id: session.id
        }
    }))?.createAccessToken()

    res.cookie('access-token', access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: parseTime(ZariumServer.getInstance().ACCESS_TOKEN_EXPIRATION_TIME)
    });

    res.send({
        detail: "Refreshed session"
    });
})

safeRoute(server.app, '/api/auth/force-logout', 'post', async (req: SafeRequest,res) => {
    res.clearCookie('access-token');
    res.clearCookie('refresh-token-key');
    res.clearCookie('refresh-token-val');

    res.send({
        detail: "Cleared session cookies"
    })
})

safeRoute(server.app, '/api/auth/logout', 'post', async (req: SafeRequest,res) => {
    const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
    const refreshTokenKey = req.cookies?.["refresh-token-key"];

    if (refreshTokenKey) {
        await (await userSessionRepo.findOne({
            where: {
                refreshTokenKey: refreshTokenKey,
            }
        }))?.revoke()
    }

    res.clearCookie('access-token');
    res.clearCookie('refresh-token-key');
    res.clearCookie('refresh-token-val');

    res.send({
        detail: "Logged out"
    })
}, {
    require_auth: true
})

safeRoute(server.app, '/api/auth/get-user-data', 'get', async (req: SafeRequest,res) => {
    const userRepository = ZariumServer.getInstance().database.dataSource.getRepository(User);
    const user = await userRepository.findOne({
        where: {
            id: req.user?.userId
        }
    })

    res.send({
        id: user?.id,
        username: user?.username,
        displayname: user?.displayname,
        superadmin: user?.superadmin,
        createdAt: user?.createdAt,
        perms: user?.perms,

    })
}, {
    require_auth: true
})

safeRoute(server.app, '/api/get-avatar', 'get', async (req: SafeRequest,res) => {
    const userId = req.query.id as string;
    if (userId == null) return res.status(400).json({ detail: "Missing user id" });

    const avatarRepository = ZariumServer.getInstance().database.dataSource.getRepository(UserAvatar);
    const avatar = await avatarRepository.findOne({
        where: {
            id: userId
        }
    });

    const defaultAvatarPath = path.join(__dirname, "../assets", "img", "profile.png");
    const avatarPath = path.join(ZariumServer.getInstance().config.data_folder, "userimages", userId);

    if (!avatar) {
        return res.send(await fs.readFile(defaultAvatarPath));
    }

    try {
        const data = await fs.readFile(avatarPath);
        res.set("Content-Type", avatar.mimetype);
        res.send(data);
    } catch {
        return res.send(await fs.readFile(defaultAvatarPath));
    }
});

safeRoute(server.app, '/api/account/avatar', 'post', async (req: SafeRequest, res) => {
    if (!req.user) return res.status(401).json({ detail: "Unauthorized" });

    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
        return res.status(400).json({ detail: "Invalid content type. Expected image/*" });
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
        const buffer = Buffer.concat(chunks);

        if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
            return res.status(413).json({ detail: "Image too large" });
        }

        const avatarRepository = ZariumServer.getInstance().database.dataSource.getRepository(UserAvatar);
        let avatar = await avatarRepository.findOne({ where: { id: req.user!.userId } });

        const avatarPath = path.join(ZariumServer.getInstance().config.data_folder, "userimages", req.user!.userId);
        await fs.writeFile(avatarPath, buffer);

        if (avatar) {
            avatar.mimetype = contentType;
        } else {
            avatar = avatarRepository.create({
                id: req.user!.userId,
                mimetype: contentType
            });
        }

        await avatarRepository.save(avatar);
        res.send({ detail: "Avatar updated" });
    });
}, {
    require_auth: true
});

safeRoute(server.app, '/api/auth/get_auth_methods', 'post', async (req: SafeRequest,res) => {
    if (!requireJson(req,res)) return;

    let methods: string[] = [];
    const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
    const user = await userRepo.findOne({where: {username: req.body.username}});
    if (!user) return res.status(401).json({ detail: "User not found." });

    methods.push("password");

    res.send({
        username: req.body.username,
        methods: methods
    })
});
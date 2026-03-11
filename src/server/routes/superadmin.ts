import {parseTime, requireJson, safeRoute} from "../utils";
import {ZariumServer} from "../ZariumServer";
import {User} from "../database/entities/User";
import {UserSession} from "../database/entities/UserSessions";
const server:ZariumServer = ZariumServer.getInstance();

safeRoute(server.app, '/api/setup/check-superadmin-key', 'post', async (req,res) => {
    if (!requireJson(req,res)) return;
    if (!(server.firstStart)) {
        res.send({
            success: false,
            detail: "Server not in setup mode."
        })
    } else {

        if (req.body.key !== server.superadminKey) {
            res.status(401).send({
                success: false,
                detail: "Invalid superadmin key."
            })
        } else {
            res.send({
                success: true,
                detail: "Superadmin key accepted."
            })
        }
    }
}, {
    middleware: [server.authLimiter]
});

safeRoute(server.app, '/api/setup/create-superadmin', 'post', async (req,res) => {
    if (!requireJson(req,res)) return;

    if (!(server.firstStart)) {
        res.send({
            success: false,
            detail: "Server not in setup mode."
        })
    } else {
        if (!(req.body.superAdminKey === server.superadminKey)) {
            res.status(401).send({
                success: false,
                detail: "Invalid superadmin key."
            })
            return;
        }

        if (req.body.password.length < 12) {
            return res.status(400).json({
                success: false,
                detail: "Password must be at least 12 characters long."
            });
        }

        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);

        const user = await User.createAccount(
            req.body.username,
            req.body.password,
            req.body.displayName,
            "",
            false // set setup to false as we are already in setup
        );

        user.superadmin = true;
        await ZariumServer.getInstance().database.dataSource.getRepository(User).save(user);

        server.firstStart = false;

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

        ZariumServer.getInstance().logger.info(`New SuperAdmin account with the username \"${user.username}\" has been registered.`);
        ZariumServer.getInstance().logger.info(`Setup mode disabled.`);

        return res.send({
            detail: "Superadmin account created.",
            id: user.id,
            username: user.username,
            vaultSalt: user.vaultSalt,
            encryptedVaultKey: user.vault?.encryptedVaultKey,
            vaultKeyIv: user.vault?.vaultKeyIv,
            vaultKeyTag: user.vault?.vaultKeyTag
        })
    }
}, {
    middleware: [server.authLimiter]
});
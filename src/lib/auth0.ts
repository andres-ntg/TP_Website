import { Auth0Client } from "@auth0/nextjs-auth0/server";

const issuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL;
const domainFromIssuer = issuerBaseUrl
	? issuerBaseUrl.replace(/^https?:\/\//, "")
	: undefined;

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
	for (const value of values) {
		const normalized = value?.trim();
		if (normalized) {
			return normalized;
		}
	}

	return undefined;
}

function resolveDomain(): string {
	const rawDomain = firstNonEmpty(process.env.AUTH0_DOMAIN, domainFromIssuer) ?? "";
	return rawDomain.replace(/^https?:\/\//, "").trim();
}

function ensureProtocol(url: string): string {
	return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

function isLocalOrPrivateUrl(url: string): boolean {
	try {
		const hostname = new URL(url).hostname;

		if (hostname === "localhost" || hostname === "127.0.0.1") {
			return true;
		}

		if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
			return true;
		}

		if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
			return true;
		}

		const match172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
		if (match172) {
			const secondOctet = Number(match172[1]);
			return secondOctet >= 16 && secondOctet <= 31;
		}

		return false;
	} catch {
		return false;
	}
}

function resolveAppBaseUrl(): string {
	const configuredBaseUrl = firstNonEmpty(process.env.APP_BASE_URL, process.env.AUTH0_BASE_URL);
	const netlifyBaseUrl = firstNonEmpty(process.env.URL, process.env.DEPLOY_PRIME_URL);
	const isNetlify = process.env.NETLIFY === "true";

	let candidate = configuredBaseUrl ?? netlifyBaseUrl ?? "http://localhost:3000";
	const normalizedCandidate = ensureProtocol(candidate);

	if (
		isNetlify &&
		configuredBaseUrl &&
		netlifyBaseUrl &&
		isLocalOrPrivateUrl(normalizedCandidate)
	) {
		candidate = netlifyBaseUrl;
	}

	return ensureProtocol(candidate).replace(/\/$/, "");
}

export const auth0 = new Auth0Client({
	domain: resolveDomain(),
	appBaseUrl: resolveAppBaseUrl(),
	clientId: process.env.AUTH0_CLIENT_ID,
	clientSecret: process.env.AUTH0_CLIENT_SECRET,
	secret: process.env.AUTH0_SECRET,
	authorizationParameters: {
		ui_locales: "es-419",
		audience: process.env.AUTH0_AUDIENCE,
	},
});

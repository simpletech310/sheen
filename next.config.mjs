import createNextIntlPlugin from "next-intl/plugin";

// next-intl plugin wires the request config so each render gets the
// right message catalog. Marketing pages get URL-prefixed locales via
// middleware.ts; in-app routes (/app, /pro) stay unprefixed and read
// users.locale from the DB.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);

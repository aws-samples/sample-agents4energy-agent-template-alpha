import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axiosMod, { AxiosRequestConfig, AxiosStatic, AxiosError } from "axios";
import * as cheerio from "cheerio";
import { isNode } from "@langchain/core/utils/env";

const DEFAULT_HEADERS = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.5",
    "Alt-Used": "LEAVE-THIS-KEY-SET-BY-TOOL",
    Connection: "keep-alive",
    Host: "LEAVE-THIS-KEY-SET-BY-TOOL",
    Referer: "https://www.google.com/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/111.0",
};

const getText = (html: string, baseUrl: string): string => {
    const $ = cheerio.load(html, { scriptingEnabled: true });
    let text = "";

    $("*:not(style):not(script):not(svg)").each((_i, elem) => {
        const $el = $(elem);
        let content = $el.clone().children().remove().end().text().trim();
        
        let href = $el.attr("href");
        if ($el.prop("tagName")?.toLowerCase() === "a" && href) {
            if (!href.startsWith("http")) {
                try {
                    href = new URL(href, baseUrl).toString();
                } catch {
                    href = "";
                }
            }

            const imgAlt = $el.find("img[alt]").attr("alt")?.trim();
            if (imgAlt) {
                content += ` ${imgAlt}`;
            }

            text += ` [${content}](${href})`;
        } else if (content !== "") {
            text += ` ${content}`;
        }
    });

    return text.trim().replace(/\n+/g, " ");
};

const getHtml = async (url: string, headers: Record<string, any>, config: AxiosRequestConfig) => {
    const axios = ("default" in axiosMod ? axiosMod.default : axiosMod) as AxiosStatic;
    
    const domain = new URL(url).hostname;
    const finalHeaders = { ...headers };
    finalHeaders.Host = domain;
    finalHeaders["Alt-Used"] = domain;

    try {
        const htmlResponse = await axios.get(url, {
            ...config,
            headers: finalHeaders,
        });

        const allowedContentTypes = [
            "text/html",
            "application/json",
            "application/xml",
            "application/javascript",
            "text/plain",
        ];

        const contentType = htmlResponse.headers["content-type"];
        const contentTypeArray = contentType.split(";");
        if (contentTypeArray[0] && !allowedContentTypes.includes(contentTypeArray[0])) {
            throw new Error("returned page was not utf8");
        }

        return htmlResponse.data;
    } catch (e) {
        if (axios.isAxiosError(e) && e.response && e.response.status) {
            throw new Error(`http response ${e.response.status}`);
        }
        throw e;
    }
};

const webBrowserToolSchema = z.object({
    url: z.string().url(),
});

export const webBrowserTool = tool(
    async ({ url }) => {
        try {
            const axiosConfig: AxiosRequestConfig = {
                withCredentials: true,
                timeout: 10000,
                maxRedirects: 5,
            };

            const html = await getHtml(url, DEFAULT_HEADERS, axiosConfig);
            const text = getText(html, url);

            return {
                content: text,
                status: 200,
                url: url
            };
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            return {
                error: `Failed to fetch URL: ${axiosError.message}`,
                status: axiosError.response?.status || 500,
                url: url
            };
        }
    },
    {
        name: "webBrowserTool",
        description: "Fetches and extracts the text content from a given URL, including links in markdown format. Returns the cleaned text content along with status code and URL.",
        schema: webBrowserToolSchema,
    }
);

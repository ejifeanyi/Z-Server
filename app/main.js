const zlib = require("zlib");
const fs = require("fs");
const net = require("net");

console.log("Logs from your program will appear here!");

let filesDirectory = "/tmp"; // Default directory

process.argv.slice(2).forEach((arg, index, args) => {
	if (arg === "--directory" && index + 1 < args.length) {
		filesDirectory = args[index + 1];
	}
});

const server = net.createServer((socket) => {
	socket.on("data", (data) => {
		const req = data.toString();
		const [requestLine, ...headerLines] = req.split("\r\n");
		const [method, requestPath] = requestLine.split(" ");
		const headers = {};

		headerLines.forEach((line) => {
			const [key, value] = line.split(": ");
			if (key && value) {
				headers[key.toLowerCase()] = value;
			}
		});

		const contentLength = headers["content-length"];
		let body = "";
		if (contentLength) {
			const headerEndIndex = req.indexOf("\r\n\r\n") + 4;
			body = req.substring(
				headerEndIndex,
				headerEndIndex + parseInt(contentLength, 10)
			);
		}

		if (method === "GET") {
			if (requestPath === "/") {
				socket.write("HTTP/1.1 200 OK\r\n\r\n");
			} else if (requestPath.startsWith("/files/")) {
				const filename = requestPath.split("/files/")[1];
				const filepath = `${filesDirectory}/${filename}`;

				fs.readFile(filepath, (err, data) => {
					if (err) {
						socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
					} else {
						socket.write(
							`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${data.length}\r\n\r\n`
						);
						socket.write(data);
					}
					socket.end();
				});
			} else if (requestPath === "/user-agent") {
				const userAgent = headers["user-agent"] || "";
				const contentLength = userAgent.length;
				socket.write(
					`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${userAgent}`
				);
				socket.end();
			} else if (requestPath.startsWith("/echo/")) {
				const content = requestPath.split("/echo/")[1];
				const acceptEncoding = headers["accept-encoding"];
				let responseHeaders = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n";
				let responseBody = content;

				if (acceptEncoding && acceptEncoding.includes("gzip")) {
					zlib.gzip(responseBody, (err, compressedData) => {
						if (err) {
							console.error("Error compressing data:", err);
							return;
						}
						responseHeaders += "Content-Encoding: gzip\r\n";
						responseHeaders += `Content-Length: ${compressedData.length}\r\n\r\n`;
						socket.write(responseHeaders);
						socket.write(compressedData);
						socket.end();
					});
				} else {
					responseHeaders += `Content-Length: ${responseBody.length}\r\n\r\n`;
					socket.write(responseHeaders);
					socket.write(responseBody);
					socket.end();
				}
			} else {
				socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
				socket.end();
			}
		} else {
			socket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
			socket.end();
		}
	});

	socket.on("close", () => {
		socket.end();
	});
});

server.listen(4221, "localhost", () => {
	console.log("Server listening on port 4221");
});

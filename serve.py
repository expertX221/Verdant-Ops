from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from api.mould import handler
from api.market import handler as market


class App(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.partition('?')[0] == '/api/market':
            return market.do_GET(self)
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/mould':
            return handler.do_POST(self)
        self.send_error(404)

    send_json = handler.send_json


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8000), App).serve_forever()

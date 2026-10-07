FROM golang:1.26-alpine AS build
WORKDIR /app
COPY apps/x7-server/go.* ./
RUN go mod download
COPY apps/x7-server/*.go ./
RUN CGO_ENABLED=0 go build -o /x7-server .
FROM alpine:3.22
RUN adduser -D x7
USER x7
COPY --from=build /x7-server /usr/local/bin/x7-server
ENV X7_LISTEN_ADDR=0.0.0.0:3003
EXPOSE 3003
CMD ["x7-server"]

## RabbitMQ

### NGINX Reverse proxy RabbitMQ

```
# option 1

    location /rabbitmq/ {
        proxy_pass              http://localhost:15672;
        proxy_set_header        Host $http_host;
        rewrite                 ^/rabbitmq/(.*)$ /$1 break;
    }

    location /rabbitmq {
        rewrite                 ^(.*)$ /rabbitmq/ permanent;
    }
    
# option 2  

location /rabbitmq/api/permissions/ {
    proxy_pass http://0.0.0.0:15672/api/permissions/%2F/;
}
location /rabbitmq/api/queues/ {
    proxy_pass http://0.0.0.0:15672/api/queues/%2F/;
}
location /rabbitmq/api/exchanges/ {
    proxy_pass http://0.0.0.0:15672/api/exchanges/%2F/;
}
location /rabbitmq/ {
    proxy_pass http://0.0.0.0:15672/;
}

# option 3

location /rabbitmq/ {
                proxy_pass http://localhost:15672;
}
location ~* /rabbitmq/api/(.*?)/(.*) {
                proxy_pass http://localhost:15672/api/$1/%2F/$2?$query_string;
}

location ~* /rabbitmq/(.*) {
                rewrite ^/rabbitmq/(.*)$ /$1 break;
                proxy_pass http://localhost:15672;
}


# scratch

location ~* /rabbitmq/(.*)/%2F/(.*) {
                proxy_pass http://localhost:15672/$1/%2F/$2?$query_string;
}

rewrite    ^(.*)%2F(.*)$    $1#$2;

if ($request_uri ~* "(.*)/%2F/(.*)") {
    proxy_pass http://localhost:15672/$1/%2F/$2;
}


set $modified_uri $request_uri;
if ($modified_uri ~ "^/(/.*)/%2F/(/.*)$") {
    set $modified_uri /$1/#/$2;
}
proxy_pass http://localhost:15672$modified_uri;

    location ~* /rabbitmq/(.*)/%2F/(.*) {
        set $modified_uri $request_uri;
        if ($modified_uri ~ "^/(/.*)/%2F/(/.*)$") {
            set $modified_uri /$1/#/$2;
        }
        proxy_pass http://localhost:15672$modified_uri;
    }
```

https://fatalfailure.wordpress.com/2012/11/16/nginx-as-reverse-proxy-for-rabbitmq-mochiweb-server/
http://rabbitmq.1065348.n5.nabble.com/object-not-found-in-RabbitMQ-admin-panel-tt8978.html#a21744
http://blog.jamesball.co.uk/2015/08/using-nginxapache-as-reverse-proxy-for.html

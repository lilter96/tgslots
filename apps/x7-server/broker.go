package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	amqp "github.com/rabbitmq/amqp091-go"
	"sync"
	"time"
)

type MathClient interface {
	Call(context.Context, Command) (Reply, error)
}
type Broker struct {
	mu         sync.Mutex
	connection *amqp.Connection
	url        string
	queue      string
}

func (b *Broker) connect() (*amqp.Connection, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.connection != nil && !b.connection.IsClosed() {
		return b.connection, nil
	}
	connection, err := amqp.DialConfig(b.url, amqp.Config{Heartbeat: 10 * time.Second, Locale: "en_US", Dial: amqp.DefaultDial(3 * time.Second)})
	if err != nil {
		return nil, errors.New("RabbitMQ unavailable")
	}
	b.connection = connection
	return connection, nil
}
func (b *Broker) Ready() error {
	connection, err := b.connect()
	if err != nil {
		return err
	}
	channel, err := connection.Channel()
	if err != nil {
		return err
	}
	defer channel.Close()
	queue, err := channel.QueueInspect(b.queue)
	if err != nil || queue.Consumers == 0 {
		return errors.New("Math worker unavailable")
	}
	return nil
}
func (b *Broker) Call(ctx context.Context, command Command) (Reply, error) {
	connection, err := b.connect()
	if err != nil {
		return Reply{}, err
	}
	channel, err := connection.Channel()
	if err != nil {
		return Reply{}, err
	}
	defer channel.Close()
	queue, err := channel.QueueDeclare("", false, true, true, false, nil)
	if err != nil {
		return Reply{}, err
	}
	responses, err := channel.Consume(queue.Name, "", true, true, false, false, nil)
	if err != nil {
		return Reply{}, err
	}
	if err = channel.Confirm(false); err != nil {
		return Reply{}, err
	}
	returns := channel.NotifyReturn(make(chan amqp.Return, 1))
	body, err := json.Marshal(command)
	if err != nil {
		return Reply{}, err
	}
	confirmation, err := channel.PublishWithDeferredConfirmWithContext(ctx, "", b.queue, true, false, amqp.Publishing{
		ContentType: "application/json", DeliveryMode: amqp.Persistent,
		CorrelationId: command.RequestID, ReplyTo: queue.Name, Expiration: "15000", Body: body,
	})
	if err != nil {
		return Reply{}, err
	}
	confirmed, err := confirmation.WaitContext(ctx)
	if err != nil || !confirmed {
		return Reply{}, errors.New("Math request publication unconfirmed")
	}
	for {
		select {
		case <-ctx.Done():
			return Reply{}, ctx.Err()
		case returned := <-returns:
			return Reply{}, fmt.Errorf("Math queue unavailable: %s", returned.ReplyText)
		case message, ok := <-responses:
			if !ok {
				return Reply{}, errors.New("Math reply channel closed")
			}
			if message.CorrelationId != command.RequestID {
				continue
			}
			var reply Reply
			if err = json.Unmarshal(message.Body, &reply); err != nil {
				return Reply{}, err
			}
			if reply.Version != 1 || reply.RequestID != command.RequestID {
				return Reply{}, errors.New("Invalid math reply")
			}
			return reply, nil
		}
	}
}

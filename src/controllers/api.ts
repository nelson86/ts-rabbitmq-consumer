import { Application, Request, Response } from "express";

import CoursesData from "../../data/courses.json";


export const loadApiEndpoints = (app: Application): void => {
  app.get("/api", async (req: Request, res: Response) => {

    return res.status(200).send(CoursesData);
  });
};

const amqp = require('amqplib');

export const consumer = async (exchange: string, routingKey: string, queue: string) => {

  const opt = { credentials: require('amqplib').credentials.plain('dev', 'dev') };
  const exchangeDL = 'publication-dl'
  const exchangeDLType = 'fanout'
  const queueDL = 'publication.deadletter'

  const args = { durable: true, autoDelete: false, closeChannelOnUnsubscribe: true,
      arguments: {
        "x-dead-letter-exchange" : exchangeDL
      //, "x-message-ttl"          : 5000  // 5 seconds
      //, "x-dead-letter-key"      : ROUTING_KEY_DL
      }
  }

  console.log('Ejecutando Consumer')

  let connection = amqp.connect('amqp://localhost', opt);
  connection.then(async (conn: any)=>{
    const channel = await conn.createChannel();

    await channel.assertExchange(exchangeDL, exchangeDLType, {durable: true})
    await channel.assertQueue(queueDL, {durable: true, autoDelete: false})
    await channel.bindQueue(queueDL, exchangeDL)

    await channel.assertQueue(queue, args)
    await channel.bindQueue(queue, exchange, routingKey);

    channel.consume(queue, (msg: any) => {

      try {
        console.log(" [%s] %s:'%s'", queue, msg.fields.routingKey, msg.content.toString());
        //msg.acknowledge();

      } catch (error) {
        msg.reject(false); // reject=true, requeue=false causes dead-lettering
      }

    });
  })
}

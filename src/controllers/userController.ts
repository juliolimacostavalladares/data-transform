import { Request, Response, RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface UserWebHook {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
    }>;
    first_name: string;
    image_url: string;
    type: "user.created";
  };
}

export const createUserWebHook: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data } = req.body as UserWebHook;
    console.log("data", data);
    const user = await prisma.user.create({
      data: {
        externalId: data.id,
        email: data.email_addresses[0].email_address,
        name: data.first_name,
      },
    });
    console.log("user", user);
    res.status(201).json({ status: user });
  } catch (error) {
    console.error("Erro ao processar a solicitação:", error);
    res.status(500).json({ error: error });
  }
};

export const findUser: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: externalId } = req.params;
    const user = await prisma.user.findUnique({
      where: {
        externalId: externalId,
      },
    });
    res.status(201).json({ user });
  } catch (error) {
    console.error("Erro ao processar a solicitação:", error);
    res.status(500).json({ error: error });
  }
};

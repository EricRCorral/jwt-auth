import { object, string } from "zod";

const USER_SCHEMA = object({
  username: string()
    .min(6)
    .max(32, { message: "Username must have a maximum of 32 characters" }),
  password: string()
    .min(6)
    .max(64, { message: "Password must have a maximum of 64 characters" }),
});

const validateUser = (input) => USER_SCHEMA.safeParse(input);

export default validateUser;

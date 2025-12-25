import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuthPayload {
  @Field() accessToken!: string;
  @Field() userId!: string;
}

@InputType()
export class RegisterInput {
  @Field() email!: string;
  @Field() username!: string;
  @Field() password!: string;
}

@InputType()
export class LoginInput {
  @Field() emailOrUsername!: string;
  @Field() password!: string;
}

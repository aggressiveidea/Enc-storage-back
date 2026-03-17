import { Schema, model } from 'mongoose';
import { User } from '../../types/globals';
import { request } from 'node:http';

export const Userschema = new Schema<User>({
  email: {
    type: String,
    trim: true,
    required: true
  },
  password: {
    type: String,
    trim: true,
    required: true
  },
  firstName: {
    type: String,
    trim: true,
    required: true
  },
  lastName: {
    type: String,
    trim: true,
    required: true
  },
  role: {
    type: String,
    trim: true,
    required: false,
    enum: ['user', 'admin'], //user is the client while admin is in the server for now
    default: 'user'
  },
  public_key: {
    type: String,
    trim: true,
    required: true,
    default: 'test'
  },
  private_key: {
    type: String,
    trim: true,
    required: true,
    default: 'test'
  }
},
  {
    timestamps: true,
  }
);
export const userModel = model<User>("user", Userschema);
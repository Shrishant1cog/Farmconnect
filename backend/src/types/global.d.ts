export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      NODE_ENV?: 'development' | 'production' | 'test' | string;
      PORT?: string;
      CLIENT_URL?: string;
      DATABASE_URL?: string;
      JWT_SECRET?: string;
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_CLIENT_EMAIL?: string;
      FIREBASE_PRIVATE_KEY?: string;
      FIREBASE_SERVICE_ACCOUNT_KEY?: string;
      FIREBASE_SERVICE_ACCOUNT_PATH?: string;
    }
  }

  interface ErrorConstructor {
    captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
  }
}
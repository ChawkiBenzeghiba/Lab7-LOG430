export default [
    {
      files: ["src/**/*.js"],
  
      languageOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        globals: {
          require: "readonly",
          module: "readonly",
          process: "readonly",
          __dirname: "readonly"
        }
      },
  
      rules: {
        "no-unused-vars": ["warn"],
        "no-console": "off"
      }
    }
  ];
  
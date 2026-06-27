import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.davidai.milktransit",
  appName: "Milk Transit",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
  },
};

export default config;

# Milk Transit App Store Release Checklist

## App Identity

- App name: `Milk Transit`
- Bundle ID: `com.davidai.milktransit`
- iOS project: `ios/App/App.xcodeproj`
- Capacitor config: `capacitor.config.ts`

## Local Build Steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure the production API URL:

   ```bash
   cp .env.ios.example .env.production
   ```

   Then set:

   ```bash
   VITE_API_BASE_URL=https://your-production-api.example.com
   ```

   The App Store build cannot use `http://localhost:3001`.

3. Build and sync iOS:

   ```bash
   npm run ios:sync
   ```

4. Open the iOS project:

   ```bash
   npm run ios:open
   ```

5. In Xcode:

   - Open `Xcode` > `Settings` > `Components`.
   - Install the iOS platform/runtime if Xcode reports that it is missing.
   - Select the `App` target.
   - Select the Apple Developer team.
   - Confirm bundle identifier: `com.davidai.milktransit`.
   - Set signing to automatic unless the developer account requires manual signing.
   - Test on a real iPhone before archiving.

6. Archive for App Store:

   - Xcode menu: `Product` > `Archive`.
   - Open Organizer.
   - Validate the archive.
   - Distribute to App Store Connect.

## Required Before Submission

- Replace the default Capacitor app icon with a final `Milk Transit` icon.
- Replace the default splash image if needed.
- Confirm the production backend is deployed and reachable over HTTPS.
- Confirm all API keys are configured on the backend, not hardcoded in the app.
- Test location permission on a real iPhone.
- Test login, search, navigation, chatbot, weather, events, holidays, and guide prompts.
- Prepare App Store screenshots for supported iPhone sizes.

## Privacy Notes

The app currently may use or store:

- User location for nearby stops, route options, and recommendations.
- Login username and password for local account functionality.
- Recent search history.
- Chatbot messages sent to the backend and Gemini verification when configured.
- Third-party API calls for routing, weather, events, holidays, and transit data.

In App Store Connect, complete App Privacy based on the final production behavior.

## Review Notes To Provide Apple

Suggested review note:

```text
Milk Transit helps Toronto users view nearby TTC stops, arrival estimates, destination routing, route delay factors, weather, events, holidays, and Toronto travel guide suggestions.

The app requests location permission to show nearby stops and location-aware recommendations. Location is used only for transit and destination functionality.
```

If login is required for a feature during review, provide a demo account in App Store Connect.

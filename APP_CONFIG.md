# App Configuration

## Changing the App Title

To change the app title from "WebLLM Chat" to something else:

1. Edit the `app.config.json` file in the root directory:
   ```json
   {
     "title": "Your Custom Title",
     "description": "Your custom description"
   }
   ```

2. The title will be automatically updated in:
   - Browser tab title
   - Main header
   - Mobile header
   - Welcome message
   - Chat interface welcome screen

## Note on Static Files

Some files like `manifest.json` and the meta tag in `app.html` still contain hardcoded "WebLLM Chat" references. These would need to be updated manually or through a build script if you need them to match your custom title.

To update these manually:
- Edit `/static/manifest.json` - Update the `name` and `short_name` fields
- Edit `/src/app.html` - Update the `apple-mobile-web-app-title` meta tag content
- Edit `/capacitor.config.ts` - Update the `appName` field (if using Capacitor)
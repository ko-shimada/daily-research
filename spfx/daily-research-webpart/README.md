# Daily Research SPFx Web Part

This folder contains a SharePoint Framework web part version of the Daily Research dashboard. It is intended to be placed on a SharePoint page and then added to Microsoft Teams as a SharePoint page tab, so users can view the dashboard inside Teams instead of opening a browser tab.

## Target

- SharePoint Online
- Microsoft Teams channel tab via a SharePoint page
- SPFx 1.21.1 / React 17.0.1
- Node.js v22 LTS for build and packaging

Microsoft's compatibility guidance lists SPFx 1.21.1 as Node.js v22 compatible. The current workstation detected Node.js v24, so build/package commands should be run from Node.js v22 LTS.

## Build

```powershell
cd spfx/daily-research-webpart
npm install
npm run build
npm run bundle:ship
npm run package-solution:ship
```

The package will be generated at:

```text
spfx/daily-research-webpart/sharepoint/solution/daily-research.sppkg
```

## Deploy

1. Upload `sharepoint/solution/daily-research.sppkg` to the tenant app catalog.
2. Approve/deploy the app.
3. Add the app to the SharePoint site `https://sbplayers.sharepoint.com/sites/CS_AI`.
4. Create or edit a SharePoint page, then add the `Daily Research` web part.
5. In Teams, open the target channel, select `+`, choose `SharePoint` or `Pages`, and pin that SharePoint page as a tab.

## Data Updates

The current implementation embeds `data/research-data.json` into `src/webparts/dailyResearch/data/researchData.ts`. When the daily research data changes, regenerate that file and rebuild the SPFx package. A later improvement can move the data source to a SharePoint list or JSON file in a document library so the app package does not need to be redeployed for every daily update.

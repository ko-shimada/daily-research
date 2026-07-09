import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'DailyResearchWebPartStrings';
import DailyResearch from './components/DailyResearch';
import { IDailyResearchProps } from './components/IDailyResearchProps';

export interface IDailyResearchWebPartProps {
  description: string;
}

export default class DailyResearchWebPart extends BaseClientSideWebPart<IDailyResearchWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IDailyResearchProps> = React.createElement(DailyResearch, {
      description: this.properties.description,
      isTeamsHost: !!this.context.sdks?.microsoftTeams
    });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: strings.PropertyPaneDescription },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', { label: strings.DescriptionFieldLabel })
              ]
            }
          ]
        }
      ]
    };
  }
}

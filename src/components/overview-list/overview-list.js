import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, intlShape } from 'react-intl';

import ProfileModal from 'components/profile-modal';
import Navigation from 'components/navigation';
import Header, { HeaderType } from 'primitives/text/header';
import FlexContainer from 'primitives/container/flex-container';
import LinkRow from 'primitives/other/link-row';

import { omit, map, size } from 'constants/lodash';
import Entities from 'constants/entities';

import './style.css';

export default class OverviewList extends Component {
  static propTypes = {
    toSafeRoute: PropTypes.func.isRequired,
    enterGameRoute: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    currentSector: PropTypes.string.isRequired,
    entities: PropTypes.shape().isRequired,
    isInitialized: PropTypes.bool.isRequired,
    params: PropTypes.shape({
      entityType: PropTypes.string,
    }).isRequired,
    intl: intlShape.isRequired,
  };

  componentWillMount() {
    if (
      !this.props.entities[Entities.sector.key][this.props.currentSector] &&
      this.props.isInitialized
    ) {
      this.props.toSafeRoute();
    } else {
      this.props.enterGameRoute();
    }
  }

  render() {
    return (
      <FlexContainer>
        <Navigation />
        <FlexContainer flex="1">
          <FlexContainer
            direction="column"
            align="center"
            className="OverviewList"
          >
            <Header type={HeaderType.header2}>
              <FormattedMessage id="misc.entities" />
            </Header>
            <div className="OverviewList-List">
              {map(
                omit(this.props.entities, Entities.sector.key),
                (entityList, entityType) => (
                  <LinkRow
                    key={entityType}
                    to={`/overview/${this.props.currentSector}/${entityType}`}
                    title={this.props.intl.formatMessage({
                      id: Entities[entityType].name,
                    })}
                    additional={
                      this.props.isInitialized
                        ? `${size(entityList)}`
                        : undefined
                    }
                    arrowClassName="OverviewList-Arrow"
                    className={
                      this.props.params.entityType === entityType
                        ? 'OverviewList-Item--selected'
                        : ''
                    }
                  />
                ),
              )}
            </div>
          </FlexContainer>
          {this.props.children}
        </FlexContainer>
        <ProfileModal />
      </FlexContainer>
    );
  }
}

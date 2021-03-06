import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { createStructuredSelector } from 'reselect';

import {
  getPrintableEntities,
  getCurrentSector,
} from 'store/selectors/entity.selectors';
import OverviewTable from './overview-table';

const mapStateToProps = createStructuredSelector({
  entities: getPrintableEntities,
  currentSector: getCurrentSector,
});

export default injectIntl(connect(mapStateToProps)(OverviewTable));

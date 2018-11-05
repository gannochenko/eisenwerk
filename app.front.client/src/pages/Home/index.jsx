import React from 'react';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import Layout from '../../components/LayoutInner';
import { Link } from 'react-router-dom';

class HomePage extends React.Component {

    render() {
        return (
            <Layout>
                Hello there 7
                <Link to="/list">List</Link>
            </Layout>
        );
    }
}

export default connect(state => state.home)(HomePage);

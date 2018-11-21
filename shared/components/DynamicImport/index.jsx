import React from 'react';

export default class DynamicImport extends React.Component {

    constructor(props) {
        super(props);
        this.state = {component: null};
    }

    componentDidMount() {
        this.reFetch();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.load !== this.props.load) {
            this.reFetch();
        }
    }

    reFetch() {
        this.props.load().then((component) => {
            this.setState(() => ({
                component: component.default ? component.default : component
            }));
        });
    }

    render() {
        return this.props.children(this.state.component);
    }
}
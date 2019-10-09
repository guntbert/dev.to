import { h, Component } from 'preact';
import PropTypes from 'prop-types';

const KEYS = {
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  TAB: 9,
  RETURN: 13,
  COMMA: 188,
  DELETE: 8,
};

/* TODO: Remove all instances of this.props.listing
   and refactor this component to be more generic */

class Tags extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedIndex: -1,
      searchResults: [],
      additionalTags: [],
      cursorIdx: 0,
      prevLen: 0,
      showingRulesForTag: null,
    };

    const algoliaId = document.querySelector("meta[name='algolia-public-id']")
      .content;
    const algoliaKey = document.querySelector("meta[name='algolia-public-key']")
      .content;
    const env = document.querySelector("meta[name='environment']").content;
    const client = algoliasearch(algoliaId, algoliaKey);
    this.index = client.initIndex(`Tag_${env}`);
  }

  componentDidMount() {
    if (this.props.listing === true) {
      this.setState({
        additionalTags: {
          jobs: [
            'remote',
            'remoteoptional',
            'lgbtbenefits',
            'greencard',
            'senior',
            'junior',
            'intermediate',
            '401k',
            'fulltime',
            'contract',
            'temp',
          ],
          forhire: [
            'remote',
            'remoteoptional',
            'lgbtbenefits',
            'greencard',
            'senior',
            'junior',
            'intermediate',
            '401k',
            'fulltime',
            'contract',
            'temp',
          ],
          forsale: ['laptop', 'desktopcomputer', 'new', 'used'],
          events: ['conference', 'meetup'],
          collabs: ['paid', 'temp'],
        },
      });
    }
  }

  componentDidUpdate() {
    // stop cursor jumping if the user goes back to edit previous tags
    if (
      this.state.cursorIdx < this.textArea.value.length &&
      this.textArea.value.length < this.state.prevLen + 1
    ) {
      this.textArea.selectionEnd = this.state.cursorIdx;
      this.textArea.selectionStart = this.textArea.selectionEnd;
    }
  }

  get selected() {
    return this.props.defaultValue
      .split(',')
      .map(item => item !== undefined && item.trim())
      .filter(item => item.length > 0);
  }

  get isTopOfSearchResults() {
    return this.state.selectedIndex <= 0;
  }

  get isBottomOfSearchResults() {
    return this.state.selectedIndex >= this.state.searchResults.length - 1;
  }

  get isSearchResultSelected() {
    return this.state.selectedIndex > -1;
  }

  render() {
    let searchResultsHTML = '';
    const searchResultsRows = this.state.searchResults.map((tag, index) => (
      <div
        tabIndex="-1"
        className={`${this.props.classPrefix}__tagoptionrow ${
          this.props.classPrefix
        }__tagoptionrow--${
          this.state.selectedIndex === index ? 'active' : 'inactive'
        }`}
        onClick={this.handleTagClick}
        data-content={tag.name}
      >
        {tag.name}
        {(tag.rules_html && tag.rules_html.length > 0) ? <button
          className={`${this.props.classPrefix}__tagsoptionrulesbutton`}
          onClick={this.handleRulesClick}
          data-content={tag.name}
        >
        {this.state.showingRulesForTag === tag.name ? 'Hide Rules' : 'View Rules'}
        </button> : ''}
        <div className={`${this.props.classPrefix}__tagrules--${this.state.showingRulesForTag === tag.name ? 'active' : 'inactive'}`} dangerouslySetInnerHTML={{ __html: tag.rules_html }} />
      </div>
    ));
    if (
      this.state.searchResults.length > 0 &&
      (document.activeElement.id === 'tag-input' || document.activeElement.className === 'articleform__tagsoptionrulesbutton')
    ) {
      searchResultsHTML = (
        <div className={`${this.props.classPrefix}__tagsoptions`}>
          {searchResultsRows}
          <div className={`${this.props.classPrefix}__tagsoptionsbottomrow`}>Some tags have rules and guidelines determined by community moderators</div>
        </div>
      );
    }

    return (
      <div className={`${this.props.classPrefix}__tagswrapper`}>
        {this.props.listing && <label htmlFor="Tags">Tags</label>}
        <input
          id="tag-input"
          type="text"
          ref={t => (this.textArea = t)}
          className={`${this.props.classPrefix}__tags`}
          placeholder={`${this.props.maxTags} tags max, comma separated, no spaces or special characters`}
          autoComplete='off'
          value={this.props.defaultValue}
          onInput={this.handleInput}
          onKeyDown={this.handleKeyDown}
          onBlur={this.handleFocusChange}
          onFocus={this.handleFocusChange}
        />
        {searchResultsHTML}
      </div>
    );
  }

  handleRulesClick = e => {
    e.preventDefault();
    if (this.state.showingRulesForTag === e.target.dataset.content) {
      this.setState({showingRulesForTag: null});
    } else {
      this.setState({showingRulesForTag: e.target.dataset.content});
    }
    // alert('hey hey')
  }

  handleTagClick = e => {
    if (e.target.className === 'articleform__tagsoptionrulesbutton') {
      return;
    }
    const input = document.getElementById('tag-input');
    input.focus();
    this.insertTag(e.target.dataset.content);
  };

  handleInput = e => {
    let { value } = e.target;
    // If we start typing immediately after a comma, add a space
    // before what we typed.
    // e.g. If value = "javascript," and we type a "p",
    // the result should be "javascript, p".
    if (e.inputType === 'insertText') {
      const isTypingAfterComma =
        e.target.value[e.target.selectionStart - 2] === ',';
      if (isTypingAfterComma) {
        value = this.insertSpace(value, e.target.selectionStart - 1);
      }
    }

    if (e.data === ',') {
      value += ' ';
    }

    this.props.onInput(value);

    const query = this.getCurrentTagAtSelectionIndex(
      e.target.value,
      e.target.selectionStart - 1,
    );

    this.setState({
      selectedIndex: 0,
      cursorIdx: e.target.selectionStart,
      prevLen: this.textArea.value.length,
    });
    console.log('handle inputs')
    return this.search(query);
  };

  getCurrentTagAtSelectionIndex(value, index) {
    let tagIndex = 0;
    const tagByCharacterIndex = {};

    value.split('').map((letter, letterIndex) => {
      if (letter === ',') {
        tagIndex += 1;
      } else {
        tagByCharacterIndex[letterIndex] = tagIndex;
      }
    });

    const tag = value.split(',')[tagByCharacterIndex[index]];

    if (tag === undefined) {
      return '';
    }
    return tag.trim();
  }

  handleKeyDown = e => {
    const component = this;

    if (
      component.selected.length === this.props.maxTags &&
      e.keyCode === KEYS.COMMA
    ) {
      e.preventDefault();
      return;
    }

    if (
      (e.keyCode === KEYS.DOWN || e.keyCode === KEYS.TAB) &&
      !this.isBottomOfSearchResults &&
      component.props.defaultValue !== ''
    ) {
      e.preventDefault();
      this.moveDownInSearchResults();
    } else if (e.keyCode === KEYS.UP && !this.isTopOfSearchResults) {
      e.preventDefault();
      this.moveUpInSearchResults();
    } else if (e.keyCode === KEYS.RETURN && this.isSearchResultSelected) {
      e.preventDefault();
      this.insertTag(
        component.state.searchResults[component.state.selectedIndex].name,
      );

      setTimeout(() => {
        document.getElementById('tag-input').focus();
      }, 10);
    } else if (e.keyCode === KEYS.COMMA && !this.isSearchResultSelected) {
      console.log('handle key down')
      this.resetSearchResults();
      this.clearSelectedSearchResult();
    } else if (e.keyCode === KEYS.DELETE) {
      if (
        component.props.defaultValue[
          component.props.defaultValue.length - 1
        ] === ','
      ) {
        this.clearSelectedSearchResult();
      }
    } else if (
      (e.keyCode < 65 || e.keyCode > 90) &&
      e.keyCode != KEYS.COMMA &&
      e.keyCode != KEYS.DELETE &&
      e.keyCode != KEYS.LEFT &&
      e.keyCode != KEYS.RIGHT &&
      e.keyCode != KEYS.TAB
    ) {
      e.preventDefault();
    }
  };

  insertTag(tag) {
    const input = document.getElementById('tag-input');

    const range = this.getRangeBetweenCommas(input.value, input.selectionStart);
    const insertingAtEnd = range[1] === input.value.length;
    const maxTagsWillBeReached = this.selected.length === this.props.maxTags;
    if (insertingAtEnd && !maxTagsWillBeReached) {
      tag += ', ';
    }

    // Insert new tag between commas if there are any.
    const newInput =
      input.value.slice(0, range[0]) +
      tag +
      input.value.slice(range[1], input.value.length);

    this.props.onInput(newInput);
    console.log('insert tag')
    this.resetSearchResults();
    this.clearSelectedSearchResult();
  }

  // Given an index of the String value, finds the range between commas.
  // This is useful when we want to insert a new tag anywhere in the
  // comma separated list of tags.
  getRangeBetweenCommas(value, index) {
    let start = 0;
    let end = value.length;

    const toPreviousComma = value
      .slice(0, index)
      .split('')
      .reverse()
      .indexOf(',');
    const toNextComma = value.slice(index).indexOf(',');

    if (toPreviousComma !== -1) {
      start = index - toPreviousComma + 1;
    }

    if (toNextComma !== -1) {
      end = index + toNextComma;
    }

    return [start, end];
  }

  handleFocusChange = e => {
    const component = this;
    setTimeout(() => {
      if (document.activeElement.id === 'tag-input') {
        return;
      }
      component.forceUpdate();
    }, 250);
  };

  insertSpace(value, position) {
    return `${value.slice(0, position)} ${value.slice(position, value.length)}`;
  }

  search(query) {
    if (query === '') {
      return new Promise(resolve => {
        setTimeout(() => {
          'search query'
          this.resetSearchResults();
          resolve();
        }, 5);
      });
    }

    return this.index
      .search(query, {
        hitsPerPage: 8,
        attributesToHighlight: [],
        filters: 'supported:true',
      })
      .then(content => {
        if (this.props.listing === true) {
          const { additionalTags } = this.state;
          const { category } = this.props;
          const additionalItems = (additionalTags[category] || []).filter(
            t => t.indexOf(query) > -1,
          );
          const resultsArray = content.hits;
          additionalItems.forEach(t => {
            if (resultsArray.indexOf(t) === -1) {
              resultsArray.push({ name: t });
            }
          });
        }
        // updates searchResults array according to what is being typed by user
        // allows user to choose a tag when they've typed the partial or whole word
        console.log('return search results')
        this.setState({
          searchResults: content.hits,
        });
      });
  }

  resetSearchResults() {
    this.setState({
      searchResults: [],
    });
  }

  moveUpInSearchResults() {
    this.setState(prevState => ({
      selectedIndex: prevState.selectedIndex - 1,
    }));
  }

  moveDownInSearchResults() {
    this.setState(prevState => ({
      selectedIndex: prevState.selectedIndex + 1,
    }));
  }

  clearSelectedSearchResult() {
    this.setState({
      selectedIndex: -1,
    });
  }
}

Tags.propTypes = {
  defaultValue: PropTypes.string.isRequired,
};

export default Tags;

'use strict';

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-release');

  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    release: {
      options: {
        tagName: 'v<%= version %>',
        commitMessage: 'chore(project): release v<%= version %>',
        tagMessage: 'chore(project): tag v<%= version %>'
      }
    }
  });
};

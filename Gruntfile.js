/* jshint node: true */

'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    typescript: {
      // Client side code uses amd modules and require.js.
      client: {
        src: [
          'src/*.ts'
        ],
        dest: 'dist',
        options: {
          target: 'es5',
          base_path: 'src',
          sourcemap: false,
          declaration: false,
          comments: true
        }
      }
    },

    stylus: {
      production: {
        options: {
          urlfunc: 'embedurl'
        },
        files: {
          'dist/x-video.css': 'src/x-video.styl'
        }
      }
    },

    // Recompile to JavaScript when a file changes.
    watch: {
      client: {
        files: [
          'src/*.ts'
        ],
        tasks: ['typescript:client'],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-contrib-stylus');
  //grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['typescript', 'stylus']);
};

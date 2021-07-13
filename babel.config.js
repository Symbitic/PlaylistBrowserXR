module.exports = (api) => {
  api.cache.using(() => process.env.NODE_ENV === 'development');

  return {
    presets: [
      [ '@babel/preset-env', { 'modules': false} ],
      '@babel/preset-typescript'
    ],
    plugins: [
      '@babel/plugin-transform-runtime'
    ],
    comments: false
  }
}

// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    ignores: ['.github/architecture/*.md'],
    rules: {
      'ts/explicit-function-return-type': 'off',
    },
  },
)
